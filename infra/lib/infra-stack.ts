import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    if (!process.env.FRONTEND_URL) {
      throw new Error("FRONTEND_URL env var is not set");
    }
    if (!process.env.PROD_DATABASE_URL) {
      throw new Error("PROD_DATABASE_URL environment variable is not set");
    } // TODO probably a neater way to do this inc typescript

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET env var is not set");
    }

    if (!process.env.DISCORD_CLIENT_ID) {
      throw new Error("DISCORD_CLIENT_ID env var is not set");
    }

    if (!process.env.DISCORD_CLIENT_SECRET) {
      throw new Error("DISCORD_CLIENT_SECRET env var is not set");
    }

    if (!process.env.DISCORD_REDIRECT_URL) {
      throw new Error("DISCORD_REDIRECT_URL env var is not set");
    }

    if (!process.env.DISCORD_BOT_TOKEN) {
      throw new Error("DISCORD_BOT_TOKEN env var is not set");
    }

    if (!process.env.PROD_DISCORD_EVENTS_CHANNEL_ID) {
      throw new Error("PROD_DISCORD_EVENTS_CHANNEL_ID env var is not set");
    }

    if (!process.env.DISCORD_TEST_CHANNEL_ID) {
      throw new Error("DISCORD_TEST_CHANNEL_ID env var is not set");
    }

    if (!process.env.DISCORD_FACTION_CHANNEL_ID) {
      throw new Error("DISCORD_FACTION_CHANNEL_ID env var is not set");
    }

    const backendLambda = new lambda.Function(this, "BucketBotHandler", {
      code: lambda.Code.fromAsset("../backend/dist"),
      handler: "handler.handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(10),
      environment: {
        JWT_SECRET: process.env.JWT_SECRET,
        DISCORD_REDIRECT_URL: process.env.DISCORD_REDIRECT_URL,
        DATABASE_URL: process.env.PROD_DATABASE_URL,
        DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
        DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
        DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
        FRONTEND_URL: process.env.FRONTEND_URL,
        NODE_EXTRA_CA_CERTS: "/var/task/certs/ca.pem", // make sure this is copied across
        DISCORD_EVENTS_CHANNEL_ID: process.env.PROD_DISCORD_EVENTS_CHANNEL_ID,
        DISCORD_TEST_CHANNEL_ID: process.env.DISCORD_TEST_CHANNEL_ID,
        DISCORD_FACTION_CHANNEL_ID: process.env.DISCORD_FACTION_CHANNEL_ID,
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
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    // Tag all resources in this stack with the project name

    // S3 bucket for frontend hosting
    const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT for production, for dev/demo only
      autoDeleteObjects: true, // NOT for production, for dev/demo only
    });

    new cdk.CfnOutput(this, "FrontendBucketName", {
      value: frontendBucket.bucketName,
      description: "Name of the S3 bucket for frontend hosting",
      exportName: "BucketBotFrontendBucketName",
    });

    const oai = new cloudfront.OriginAccessIdentity(this, "FrontendOAI");

    frontendBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [frontendBucket.arnForObjects("*")],
        principals: [
          new iam.CanonicalUserPrincipal(
            oai.cloudFrontOriginAccessIdentityS3CanonicalUserId,
          ),
        ],
      }),
    );

    const distribution = new cloudfront.Distribution(
      this,
      "FrontendDistribution",
      {
        defaultBehavior: {
          origin: new cloudfront_origins.S3Origin(frontendBucket, {
            originAccessIdentity: oai,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.minutes(5),
          },
        ],
      },
    );

    new s3deploy.BucketDeployment(this, "DeployFrontend", {
      sources: [s3deploy.Source.asset("../frontend/dist")],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ["/*"],
      prune: true,
    });

    // Output the API Gateway URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "URL of the API Gateway endpoint",
      exportName: "BucketBotApiUrl",
    });

    new cdk.CfnOutput(this, "FrontendUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: "URL of the Frontend",
      exportName: "BucketBotFrontendUrl",
    });
    cdk.Tags.of(this).add("project", "Bucket Bot");
  }
}
