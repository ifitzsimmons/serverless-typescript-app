const createForum = require('../CreateForum/createForum');
const { DynamoDB } = require('aws-sdk');

describe('#createForum service tests', () => {
  it('createForum.createForum adds item to DDB Table', async () => {
    const putSpy = jest
      .spyOn(DynamoDB.DocumentClient.prototype, 'put')
      .mockImplementation(() => ({ promise: jest.fn() }));
    await createForum.createForum({ ForumName: 'forum@ name', User: 'John' });

    expect(putSpy).toHaveBeenCalledWith({
      TableName: process.env.ForumTable,
      Item: {
        partitionKey: 'TYPE#FORUM',
        sortKey: 'NAME#forumname',
        User: 'John',
        ForumName: 'forum@ name',
      },
      ConditionExpression: '#pk <> :partitionKey AND #sk <> :sortKey',
      ExpressionAttributeNames: {
        '#pk': 'partitionKey',
        '#sk': 'sortKey',
      },
      ExpressionAttributeValues: {
        ':partitionKey': 'TYPE#FORUM',
        ':sortKey': 'NAME#forumname',
      },
    });
  });
});
