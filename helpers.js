const global = require('./global')

function calculateAveragePositiveScores(dataArray) {
    const labelMap = new Map(); // To store positive scores and counts for each label
  
    for (const item of dataArray) {
      if (item.hasOwnProperty('label') && item.hasOwnProperty('positive_score')) {
        const label = item.label;
        const positiveScore = parseFloat(item.positive_score);
  
        if (!labelMap.has(label)) {
          // Initialize for a new label
          labelMap.set(label, { totalScore: positiveScore, count: 1 });
        } else {
          // Update existing label
          const existingData = labelMap.get(label);
          labelMap.set(label, {
            totalScore: existingData.totalScore + positiveScore,
            count: existingData.count + 1,
          });
        }
      }
    }
  
    // Calculate average for each label
    const averages = [];
    for (const [label, data] of labelMap.entries()) {
      const score = (data.totalScore / data.count).toFixed(3);
      averages.push({ label, score });
    }
  
    return averages;
}

function splitSentenceIntoParts(sentence) {
    const words = sentence.split(' ');
    const chunkSize = Math.ceil(words.length / 4); // Divide into 4 roughly equal parts
  
    const result = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      result.push(chunk);
    }
  
    return result;
}
  
async function findHighestScoreLanguageCode(languages) {
    return new Promise((resolve, reject) => {
      let highestScore = 0;
      let highestScoreLanguageCode = '';
      
      for(let i=0;i<languages.Languages.length;i++){  
            if (languages.Languages[i].Score > highestScore) {
                highestScore = languages.Languages[i].Score;
                highestScoreLanguageCode = languages.Languages[i].LanguageCode;
            }
        }
  
      if (highestScoreLanguageCode) {
        resolve(highestScoreLanguageCode);
      } else {
        reject(new Error('No language found with positive score.'));
      }

    });
  }

function findHighestScoredItems(scoreArray, threshold) {
    
    var highScoreItems = [];
    for (let i=0;i<scoreArray.length;i++) {
        const score = scoreArray[i].Score;
        if (score >= threshold) {
            highScoreItems.push(scoreArray[i])
        }
    }
    highScoreItems.forEach(item => { item.Score = (item.Score * 100).toFixed(3) })
    return highScoreItems;
}

async function findClientByAPIKey(apiKey) {
    for(let clientName in global.Secrets){
        if(global.Secrets[clientName] == apiKey)
            return clientName;
    }
    return null
}

  module.exports = {
    CalculateAveragePositiveScores:calculateAveragePositiveScores,
    SplitSentenceIntoParts:splitSentenceIntoParts,
    FindHighestScoreLanguageCode:findHighestScoreLanguageCode,
    FindClientByAPIKey:findClientByAPIKey,
    FindHighestScoredItems:findHighestScoredItems
  }