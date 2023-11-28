import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Game, Team } from "./types";
import {
  slugify,
  extractCountryCode,
  convertToDate,
  convertToDateTime,
  extractDivision,
  dateToExpiration,
  tryParseFloat
} from "./utils";

const s3Client = new S3Client({ region: "eu-north-1" });
const client = new DynamoDB({ region: "eu-north-1" });
const documentClient = DynamoDBDocument.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  }
});

export const handler = async (event: any) => {
  const bucket = event.Records[0].s3.bucket.name;
  console.log(`BUCKET: ${bucket}`);

  const file = event.Records[0].s3.object.key;
  console.log(`FILE: ${file}`);
  
  const response = await s3Client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: file,
  }));

  const body = await response.Body?.transformToString("utf8") || "";
  const lines = body.split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(","));
  for (const line of lines.slice(1)) {
    const homeTeam: Team = {
      identifier: slugify(line[3]),
      name: line[3],
    };

    const awayTeam: Team = {
      identifier: slugify(line[4]),
      name: line[4],
    };
    
    const game: Game = {
      identifier: `${extractCountryCode(`${line[0]}`)}#${homeTeam.identifier}#${awayTeam.identifier}`,
      date: convertToDate(`${line[1]}`),
      dateTime: convertToDateTime(`${line[1]}`, `${line[2]}`),
      countryCode: extractCountryCode(`${line[0]}`),
      division: extractDivision(`${line[0]}`),
      homeTeam,
      awayTeam,
      odds: [
        {
          identifier: "b365",
          home: tryParseFloat(line[11]),
          draw: tryParseFloat(line[12]),
          away: tryParseFloat(line[13]),
        }
      ],
      lastUpdatedAt: new Date().toISOString(),
      expiresAt: dateToExpiration(`${line[1]}`),
    };

    const putCommand = new PutCommand({
      TableName: process.env.TABLE,
      Item: game
    });
  
    await documentClient.send(putCommand);
  }
}