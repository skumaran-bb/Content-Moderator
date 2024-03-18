const helpers = require('./helpers')
const log = require('./awsLogger')

async function ValidateUser (req, res, next){
    const apiKey = req.headers['x-api-key']

    if(apiKey){
        if(await helpers.FindClientByAPIKey(apiKey)){
            next()
        }
        else
            res.status(401).send({
                message: "Unauthorized"
            })
    }
    else
    {
        res.status(401).send({
            message: "Unauthorized"
        })
    }
}

module.exports = { ValidateUser }