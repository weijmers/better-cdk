import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// import * as sqs from "aws-cdk-lib/aws-sqs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as scheduler from "aws-cdk-lib/aws-scheduler";
import * as eventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigw from "aws-cdk-lib/aws-apigateway";

export class BetterCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, "BetterCdkQueue", {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    const table = new dynamodb.Table(this, "games", {
      partitionKey: {
        name: "date",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "identifier",
        type: dynamodb.AttributeType.STRING
      },
      timeToLiveAttribute: "expiresAt",
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const bucket = new s3.Bucket(this, "downloads", {
      eventBridgeEnabled: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const downloader = new lambda.Function(this, "downloader", {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset("resources"),
      handler: "downloader.handler",
      environment: {
        BUCKET: bucket.bucketName,
      },
      // this is not working in the same manner as SAM 
      // events for serverless functions, will probably have 
      // to create the cron job as a separate object and 
      // attach it ...
      events: [], 
      
      // no build-in permissions to sets like in SAM :(
      // need to specify the full PolicyStatement with:
      // new iam.PolicyStatement({ ... })
      initialPolicy: []
    });

    // this is quite simple and nice though :P
    bucket.grantReadWrite(downloader);

    const scheduleRole = new iam.Role(this, "scheduleRole", {
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
    });

    const schedulePolicy = new iam.Policy(this, "schedulePolicy", {
      roles: [scheduleRole],
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["lambda:InvokeFunction"],
          resources: [downloader.functionArn]
        })
      ]
    });

    const schedule = new scheduler.CfnSchedule(this, "schedule", {
      scheduleExpression: "cron(0 0 * * ? *)",
      flexibleTimeWindow: {
        mode: "OFF"
      },
      target: {
        arn: downloader.functionArn,
        roleArn: scheduleRole.roleArn,
      }
    });

    const trigger = new lambda.Function(this, "trigger", {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset("resources"),
      handler: "trigger.handler",
      environment: {
        BUCKET: bucket.bucketName,
        TABLE: table.tableName,
      },
    });

    bucket.grantRead(trigger);
    table.grantReadWriteData(trigger);
    trigger.addEventSource(new eventSources.S3EventSource(bucket, {
      events: [ s3.EventType.OBJECT_CREATED ],
    }));

    const get = new lambda.Function(this, "get", {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(5),
      code: lambda.Code.fromAsset("resources"),
      handler: "api.handler",
      environment: {
        TABLE: table.tableName,
      },
    });

    table.grantReadData(get);

    const api = new apigw.RestApi(this, "api");
    const getIntegration = new apigw.LambdaIntegration(get, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    api.root.addMethod("GET", getIntegration);

    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.url
    });
  }
}
