const { SecretsManagerClient,  GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager")

async function getSecrets() {

const secret_name = "content-moderator-clients-keys";

  const client = new SecretsManagerClient({
    region: "us-west-2",
  });
  
  let response;
  
  try {
    response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT",
      })
    );
  } catch (error) {
    // For a list of exceptions thrown, see
    // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    throw error;
  }
  
  return response.SecretString;
}

module.exports = {
    GetSecrets : getSecrets
}