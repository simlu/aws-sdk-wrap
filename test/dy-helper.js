const { DynamoDB } = require('aws-sdk');

const dynamoDB = async (cmd, params) => {
  const ddb = new DynamoDB({
    endpoint: 'http://dynamodb-local:8000',
    apiVersion: '2012-08-10',
    region: 'us-west-2',
    accessKeyId: 'XXXXXXXXXXXXXXXXXXXX',
    secretAccessKey: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
  });
  return ddb[cmd](params).promise();
};

module.exports.LocalTable = (model) => {
  const schema = model.schema;
  return {
    create: async () => dynamoDB('createTable', schema),
    delete: async () => dynamoDB('deleteTable', { TableName: schema.TableName })
  };
};