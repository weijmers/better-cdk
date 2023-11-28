import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { Game } from "./types";

const client = new DynamoDB({ region: "eu-north-1" });
const documentClient = DynamoDBDocument.from(client, {});

export const handler = async (evt: any) => {
  const games = await documentClient.scan({
    TableName: process.env.TABLE,
  });

  return {
    statusCode: 200,
    body: JSON.stringify((games.Items as Game[]) ?? [])
  };
};
