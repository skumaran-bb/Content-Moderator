const express = require('express')
const app = express()
const toxicity = require('@tensorflow-models/toxicity');
const { environment } = require('@tensorflow/tfjs');
const _ = require('underscore')
const log = require('./awsLogger')
const awsSecrets = require('./secrets')
const auth = require('./middleware')
var global = require('./global')
const helpers = require('./helpers')
const languageCodeValidator = require('./languageCodes')
const { ComprehendClient, DetectToxicContentCommand, DetectDominantLanguageCommand } = require("@aws-sdk/client-comprehend"); // CommonJS import


//References:
//https://storage.googleapis.com/tfjs-models/demos/toxicity/index.html
//https://medium.com/tensorflow/text-classification-using-tensorflow-js-an-example-of-detecting-offensive-language-in-browser-e2b94e3565ce
//https://dev.to/bekahhw/youre-toxic-using-the-toxicity-model-with-tensorflowjs-5h27

// The minimum prediction confidence.
const threshold = 0.85 //0.9

// Which toxicity labels to return.
const labelsToInclude = ['identity_attack', 'insult', 'threat'];

app.use(express.json())
app.use(auth.ValidateUser)
//app.all('/*', auth)

awsSecrets.GetSecrets().then((s)=>{    
    global.Secrets = JSON.parse(s)
})

app.get('/secrets', (req, res) => {
    log.Info(global.Secrets, req)
    log.Info("This is the simple text", req)

    res.json(global.Secrets)
    res.end()
})

app.get('/secret', async (req, res) => {
    const apiKey = req.headers['x-api-key']

    if(apiKey){
        const clientName = await helpers.FindClientByAPIKey(apiKey)
        if(clientName)
            res.json(`{'clientName': '${clientName}'}`)
        else
            res.status(404).send('Invalid key')
    }
    else
    {
        res.status(404).send('Invalid key')
    }
})


app.post('/tensorflow', (req, res) => {
    const content = req.body.content
    var result=''
    var resultArray = []

    //we can also batch inputs to model.classify() for faster per-sentence inference time. 
    //In practice we’ve found that a batch size of four works well, although the optimal number will depend on the length of each individual sentence.
    //const sentences = ["You are the moron",", what a stupid idea","you are bringing in here."]
    //const sentences = ["You are the beautiful person"]
    //const sentences = splitSentenceIntoParts(content)
    const sentences = content

    toxicity.load(threshold).then(model => {
        // Now you can use the `model` object to label sentences. 
        model.classify(sentences).then(predictions => {

            for (let index = 0; index < predictions.length; index++) {
                const prediction = predictions[index];

                prediction.results.forEach(e => {
                    
                    if(e.match){
                        result = result + ' ' + `${prediction.label} - ${(e.probabilities[0]*100).toFixed(2)}% | ${(e.probabilities[1]*100).toFixed(2)}%`
                        
                        resultArray.push(
                            {
                                "label": prediction.label,
                                "negative_score": (e.probabilities[0]*100).toFixed(2),
                                "positive_score": (e.probabilities[1]*100).toFixed(2)
                            })
                    }
                    
                });
            }

            if(resultArray.length == 0){
                result = "Content is not moderated"
            }
            else{
                const labels = _.keys(_.countBy(resultArray, function(data) { return data.label; }));
                result = "Your content is moderated by " + labels.join(", ")
            }
        })
        .then(()=>{
            //log.Info()
            res.json({
                "content": content,
                "result": result,
                "scores": helpers.CalculateAveragePositiveScores(resultArray)
            })
            res.end()
        })
    });
    
})


app.post("/aws", async (req, res) => {

    try{
        const comprehendClient = new ComprehendClient();
        var userContent = req.body.content
        const inputLanguageCode = req.body.languageCode

        var highestScoredLanguageCode = null

        if(inputLanguageCode){
            // Validate the language code
            if(await languageCodeValidator.IsLanguageCodeExists(inputLanguageCode)){
                highestScoredLanguageCode = inputLanguageCode
            }
            else{
                log.Info("Invalid language code detected")
            }
        }
        
        if(!highestScoredLanguageCode){
            const languageInput = {
                "Text": userContent
            }
            const detectLanguageCommand = new DetectDominantLanguageCommand(languageInput)
            const detectedLanguages = await comprehendClient.send(detectLanguageCommand)
            log.Info('Language detected.', req)
            highestScoredLanguageCode = await helpers.FindHighestScoreLanguageCode(detectedLanguages)
        }

        if(highestScoredLanguageCode != "en"){
            // Perform translation from given language to English
            const { TranslateClient, TranslateTextCommand } = require("@aws-sdk/client-translate"); // CommonJS import
            const translateClient = new TranslateClient();
            const translateInput = { 
                                        Text: userContent, // required
                                        SourceLanguageCode: highestScoredLanguageCode, // required
                                        TargetLanguageCode: "en", // required
                                        
                                    };
            const translateCommand = new TranslateTextCommand(translateInput);
            const translatedContentResponse = await translateClient.send(translateCommand);

            if(translatedContentResponse){
                userContent = translatedContentResponse.TranslatedText
                log.Info(`Translation done. Language code from ${translateInput.SourceLanguageCode} to en`, req)
            }
        }

        const toxicContentInput =   { 
            TextSegments: [ 
                { 
                    Text: userContent
                }  
            ],
            LanguageCode: "en" // only 'en' is allowed
        }

        const toxicContentCommand = new DetectToxicContentCommand(toxicContentInput);        
        const response = await comprehendClient.send(toxicContentCommand);

        log.Info(`Content moderation used. Comprehend request id: ${response.$metadata.requestId}`, req)

        const highestScoredItems = await helpers.FindHighestScoredItems(response.ResultList[0].Labels, threshold)
        
        const result = "Your content is moderated by " + highestScoredItems.map(item => item.Name).join(", ")

        res.json({
            "content": userContent,
            "result": result,
            "scores": highestScoredItems
        })
        res.end()
    }catch(err){
        log.Error(err)
        res.json(err)
        res.end()
    }
})

app.listen(3500, ()=>{console.log("Listening at port number: 3500")})