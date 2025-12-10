import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    } // TODO probably a neater way to do this inc typescript

    const backendLambda = new lambda.Function(this, "BucketBotHandler", {
      code: lambda.Code.fromAsset("../backend/dist"),
      handler: "handler.handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      environment: {
        DATABASE_URL: process.env.DATABASE_URL,
        NODE_EXTRA_CA_CERTS: "/var/task/certs/ca.pem", // make sure this is copied across
      },
    });

    // API Gateway
    const api = new apigateway.RestApi(this, "BucketBotApi", {
      restApiName: "Bucket Bot Service",
      description: "API Gateway for Bucket Bot backend.",
    });

    // /v1 resource
    const v1 = api.root.addResource("v1");
    v1.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(backendLambda),
      anyMethod: true,
    });

    // Tag all resources in this stack with the project name
    cdk.Tags.of(this).add("project", "Bucket Bot");

    // Output the API Gateway URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "URL of the API Gateway endpoint",
      exportName: "BucketBotApiUrl",
    });
  }
}
