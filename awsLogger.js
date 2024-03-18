const awsLogger = require('aws-sdk')
var os = require("os");
var hostname = os.hostname();
const helpers = require('./helpers')

awsLogger.config.update({
    region: 'us-west-2'
})

const cloudWatchLogger = new awsLogger.CloudWatchLogs()

exports.Info = async(message, req) =>{
    
    WriteLog(JSON.stringify({
        "Type": "INFO",
        "HostName": hostname,
        "Client": await helpers.FindClientByAPIKey(req.headers['x-api-key']),
        "Message": message
    }))
    console.log(message)
}

exports.Error = async(message, clientName) =>{
    WriteLog(JSON.stringify({
        "Type": "ERROR",
        "HostName": hostname,
        "Client": clientName,
        "Message": message
    }))
    console.log(message)
}

async function WriteLog(message) {
    const params = {
        logGroupName: 'content-moderation',
        logStreamName: 'dev',
        logEvents: [
            {
                message: message,
                timestamp: new Date().getTime()
            }
        ]
    }
    await cloudWatchLogger.putLogEvents(params).promise()
}