import { DynamoDB } from 'aws-sdk';
import { ForumData, LambdaResponse } from '../global';

const ddb = new DynamoDB.DocumentClient();
const TableName: string = <string>process.env.ForumTable;

/**
 * Adds a new Forum to the DynamoDB table
 *
 * @param ForumName - name of the forum that the thread belongs to
 * @param User - username of the user posting the reply
 */
const createForum = async ({ ForumName, User }: ForumData): Promise<void> => {
  const forumKey: string = ForumName.replace(/[^a-zA-Z]/g, '');

  const putParams: DynamoDB.DocumentClient.PutItemInput = {
    TableName,
    Item: {
      partitionKey: 'TYPE#FORUM',
      sortKey: `NAME#${forumKey}`,
      User,
      ForumName,
    },
    ConditionExpression: '#pk <> :partitionKey AND #sk <> :sortKey',
    ExpressionAttributeNames: {
      '#pk': 'partitionKey',
      '#sk': 'sortKey',
    },
    ExpressionAttributeValues: {
      ':partitionKey': 'TYPE#FORUM',
      ':sortKey': `NAME#${forumKey}`,
    },
  };

  try {
    await ddb.put(putParams).promise();
  } catch (ex) {
    if (ex.code === 'ConditionalCheckFailedException') {
      ex.message = `Forum, "${ForumName}", already exists.`;
    }
    throw ex;
  }
};

/**
 * Service for creating a new forum.
 *
 * @param {LambdaEvent} event - Lambda invocation data
 * @return {LambdaResponse}
 */
module.exports.handler = async (event: ForumData, context): Promise<LambdaResponse> => {
  console.log('EVENT: ', JSON.stringify(event));

  const response: LambdaResponse = {
    status: 200,
  };

  try {
    await createForum(event);
  } catch (ex) {
    console.error(JSON.stringify(ex.stack));
    response.error = {
      code: ex.code,
      message: ex.message,
    };
    response.status = -1;
  }

  return response;
};
