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

    if (!process.env.PROD_DATABASE_URL) {
      throw new Error("PROD_DATABASE_URL environment variable is not set");
    } // TODO probably a neater way to do this inc typescript

    const backendLambda = new lambda.Function(this, "BucketBotHandler", {
      code: lambda.Code.fromAsset("../backend/dist"),
      handler: "handler.handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      environment: {
        DATABASE_URL: process.env.PROD_DATABASE_URL,
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
            oai.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
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
      }
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
  }
}
