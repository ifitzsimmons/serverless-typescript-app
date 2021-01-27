import { DynamoDB } from 'aws-sdk';
import { CreateReplyEvent, LambdaResponse, ThreadItem } from '../global';
import { ReplyCountAndSortKey, ThreadUpdate } from './createReplyTypes';

const ddb = new DynamoDB.DocumentClient();
const TableName: string = <string>process.env.ForumTable;

/**
 * This function increments the number of replies for a given thread
 * and also increments the thread reply sort key
 *
 * @param forumName - Name of the thread's forum in normal form
 *                    (no spaces or special characters)
 * @param threadTitle -  Name of the thread in normal form (no spaces
 *                        or special characters.)
 * @return New reply count and new reply count sort key
 */
const getNewReplyCountAndSortKey = async (
  forumName: string,
  threadTitle: string
): Promise<ReplyCountAndSortKey> => {
  const getItemParams: DynamoDB.DocumentClient.GetItemInput = {
    TableName,
    Key: {
      partitionKey: `FORUM#${forumName}`,
      sortKey: `THREAD#${threadTitle}`,
    },
    ProjectionExpression: 'Replies, threadReplySortKey',
  };

  const response = await ddb.get(getItemParams).promise();
  const item = response.Item as ThreadItem;

  if (!item) {
    throw new Error(
      `The thread, ${threadTitle}, no longer exists on the forum, ${forumName}.`
    );
  }

  const newReplyCount = item.Replies + 1;
  const indexSorter = item.threadReplySortKey.split('#');
  const newSort = `${newReplyCount}#${indexSorter[1]}`;

  return { newReplyCount, newSort };
};

/**
 * Returns the DynamoDB Update params for a thread once the new replyCount
 * and new reply sort key has been retrieved.
 *
 * @param forumName - Name of the thread's forum in normal form
 *                             (no spaces or special characters)
 * @param threadTitle -  Name of the thread in normal form (no spaces
 *                                or special characters.)
 * @param newReplyCount - Reply count after the reply has been posted
 * @param newSort - Index sort key for querying threads by number of replies
 * @return DynamoDB Update parameters for the thread that is being replied to
 */
const getThreadUpdateParams = (
  forumName: string,
  threadTitle: string,
  newReplyCount: number,
  newSort: string
): ThreadUpdate => {
  return {
    TableName,
    Key: {
      partitionKey: `FORUM#${forumName}`,
      sortKey: `THREAD#${threadTitle}`,
    },
    UpdateExpression:
      'SET Replies = :newReply, threadReplySortKey = :newReplySorter',
    ExpressionAttributeValues: {
      ':newReply': newReplyCount,
      ':newReplySorter': newSort,
    },
  };
};

/**
 * Updates the Thread contents with new reply counts and posts the reply in
 * one `transactWrite` request, meaning the DDB changes are "all or nothing".
 *
 * @param ForumName - name of the forum that the thread belongs to
 * @param ThreadTitle - name of the thread being replied to
 * @param Message - the message of the reply post
 * @param User - username of the user posting the reply
 * @param PostedTime - optional parameter for the time of the post
 */
const postReply = async ({
  ForumName,
  ThreadTitle,
  Message,
  User,
  PostedTime,
}: CreateReplyEvent): Promise<void> => {
  // add this to layer
  const time: number = PostedTime
    ? new Date(PostedTime).getTime()
    : new Date().getTime();

  const threadKey = ThreadTitle.replace(/[^a-zA-Z]/g, '');
  const forumKey = ForumName.replace(/[^a-zA-Z]/g, '');
  const userKey = User.replace(/[^a-zA-Z]/g, '');

  const { newReplyCount, newSort } = await getNewReplyCountAndSortKey(
    forumKey,
    threadKey
  );

  const updateParams = await getThreadUpdateParams(
    forumKey,
    threadKey,
    newReplyCount,
    newSort
  );

  const putParams = {
    TableName,
    Item: {
      partitionKey: `${forumKey}#${threadKey}`,
      sortKey: `REPLY#${threadKey}${time}${userKey}`,
      Message,
      User,
      LastUpdatedTime: time,
    },
    ConditionExpression: '#pk <> :partitionKey AND #sk <> :sortKey',
    ExpressionAttributeNames: {
      '#pk': 'partitionKey',
      '#sk': 'sortKey',
    },
    ExpressionAttributeValues: {
      ':partitionKey': `${forumKey}#${threadKey}`,
      ':sortKey': `REPLY#${threadKey}${time}${userKey}`,
    },
  };

  const txnItems: DynamoDB.DocumentClient.TransactWriteItemsInput = {
    TransactItems: [{ Put: putParams }, { Update: updateParams }],
  };

  await ddb.transactWrite(txnItems).promise();
};

/**
 * Service for adding a reply to an existing thread.
 *
 * @param {CreateReplyEvent} event - Lambda invocation data
 * @return status of 200 for a succesful request and -1 otherwise. If there's
 *         an error, information will be available via the `error` property
 */
module.exports.handler = async (event: CreateReplyEvent): Promise<LambdaResponse> => {
  console.log('EVENT: ', JSON.stringify(event));

  const response: LambdaResponse = {
    status: 200,
  };

  try {
    await postReply(event);
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
