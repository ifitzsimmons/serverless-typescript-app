import { DynamoDB } from 'aws-sdk';

interface ForumData {
  ForumName: string;
  User: string;
}

interface LambdaResponse {
  status: -1 | 200;
  error?: {
    code: string;
    message: string;
  }
}

type ForumTableKey = {
  partitionKey: string;
  sortKey: string
}

interface CreateReplyEvent extends ForumData{
  ThreadTitle: string;
  Message: string;
  PostedTime: string;
}


// TABLE ITEMS
interface ThreadItem extends DynamoDB.DocumentClient.AttributeMap {
  ForumName: string;
  ThreadTitle: string;
  partitionKey: string;
  sortKey: string;
  Message: string;
  User: string;
  LastUpdateTime: number;
  Replies: number;
  threadReplySortKey: string;
  threadTimeSortKey: string;
}