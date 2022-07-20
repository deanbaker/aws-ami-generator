import { LambdaIntegration, MethodLoggingLevel, RestApi, ApiKey } from "aws-cdk-lib/aws-apigateway"
import { PolicyStatement } from "aws-cdk-lib/aws-iam"
import { Function, Runtime, AssetCode, Code } from "aws-cdk-lib/aws-lambda"
import { Duration, Stack, StackProps } from "aws-cdk-lib"
import s3 = require("aws-cdk-lib/aws-s3")
import { Construct } from "constructs"

interface LambdaApiStackProps extends StackProps {
    functionName: string
}

export class CDKExampleLambdaApiStack extends Stack {
    private restApi: RestApi
    private lambdaFunction: Function
    private bucket: s3.Bucket

    constructor(scope: Construct, id: string, props: LambdaApiStackProps) {
        super(scope, id, props)

        this.bucket = new s3.Bucket(this, "WidgetStore")

        this.restApi = new RestApi(this, this.stackName + "RestApi", {
            defaultMethodOptions: {
                apiKeyRequired: true,
            },
            deployOptions: {
                stageName: "beta",
                metricsEnabled: true,
                loggingLevel: MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
            },
        })

        const apiKey = this.restApi.addApiKey("amiApiKey", {
            apiKeyName: "amiApiKey",
            value: "MyApiKeyThatIsAtLeast20Characters",
        })

        this.restApi
            .addUsagePlan("usagePlan", {
                name: "defaultPlan",
                apiStages: [
                    {
                        stage: this.restApi.deploymentStage,
                    },
                ],
            })
            .addApiKey(apiKey)

        const lambdaPolicy = new PolicyStatement()
        lambdaPolicy.addActions("s3:ListBucket")
        lambdaPolicy.addResources(this.bucket.bucketArn)

        this.lambdaFunction = new Function(this, props.functionName, {
            functionName: props.functionName,
            handler: "handler.handler",
            runtime: Runtime.NODEJS_16_X,
            code: new AssetCode(`./src`),
            memorySize: 512,
            timeout: Duration.seconds(10),
            environment: {
                BUCKET: this.bucket.bucketName,
            },
            initialPolicy: [lambdaPolicy],
        })

        this.restApi.root.addMethod("GET", new LambdaIntegration(this.lambdaFunction, {}))
    }
}
