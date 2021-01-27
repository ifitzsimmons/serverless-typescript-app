import { DynamoDB } from 'aws-sdk';
import { ForumTableKey } from '../global';

interface ThreadUpdate extends DynamoDB.DocumentClient.UpdateItemInput {
  TableName: string;
  Key: ForumTableKey;
  UpdateExpression: string;
  ExpressionAttributeValues: {
    [name: string]: string | number
  };
}

type ReplyCountAndSortKey = {
  /** Number of Thread replies after the reply is posted */
  newReplyCount: number;
  /** New sort key for querying the Threads by number of replies */
  newSort: string;
};