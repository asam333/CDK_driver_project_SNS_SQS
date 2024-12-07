import { Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

export interface LambdaStackProps extends StackProps {
    table: dynamodb.Table;
    bucket: s3.Bucket;
    sizeTrackingQueue: sqs.Queue;
    loggingQueue: sqs.Queue;
}

export class LambdaStack extends Stack {
    public readonly plottingApiUrl: string;
    public readonly driverLambda: lambda.Function;
    public readonly loggingLambdaLogGroupName: string;

    constructor(scope: Construct, id: string, props: LambdaStackProps) {
        super(scope, id, props);

        const { table, bucket, sizeTrackingQueue, loggingQueue } = props;

        // Size Tracking Lambda
        const sizeTrackingLambda = new lambda.Function(this, 'SizeTrackingLambda', {
            runtime: lambda.Runtime.PYTHON_3_10,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/size-tracking'),
            environment: {
                TABLE_NAME: table.tableName,
                BUCKET_NAME: bucket.bucketName
            }
        });

        sizeTrackingLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: ['s3:*'],
            effect: iam.Effect.ALLOW,
            resources: [bucket.bucketArn, bucket.bucketArn + '/*'],
        }))
        sizeTrackingLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:*'],
            effect: iam.Effect.ALLOW,
            resources: [table.tableArn],
        }))
        bucket.grantRead(sizeTrackingLambda);
        table.grantWriteData(sizeTrackingLambda);

        bucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3n.LambdaDestination(sizeTrackingLambda)
        );
        bucket.addEventNotification(
            s3.EventType.OBJECT_REMOVED,
            new s3n.LambdaDestination(sizeTrackingLambda)
        );
        sizeTrackingQueue.grantConsumeMessages(sizeTrackingLambda);



        // Logging Lambda
        const loggingLambda = new lambda.Function(this, 'LoggingLambda', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/logging'),
            environment: {
                LOG_GROUP_NAME: `/aws/lambda/LoggingLambda`,
                REGION: this.region
            },
            initialPolicy: [
                new iam.PolicyStatement({
                    actions: ['logs:FilterLogEvents'],
                    resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/LoggingLambda:*`]
                })
            ]
        });
        loggingLambda.addEventSource(new lambdaEventSources.SqsEventSource(loggingQueue));
        this.loggingLambdaLogGroupName = `/aws/lambda/LoggingLambda`;


        // Plotting Lambda
        const plottingLambda = new lambda.Function(this, 'PlottingLambda', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'index.lambda_handler',
            code: lambda.Code.fromAsset('lambda/plotting'),
            environment: {
                TABLE_NAME: table.tableName,
                BUCKET_NAME: bucket.bucketName
            }
            // add layers as needed
        });
        table.grantReadData(plottingLambda);
        bucket.grantWrite(plottingLambda);

        const api = new apigateway.LambdaRestApi(this, 'PlottingApi', {
            handler: plottingLambda
        });
        this.plottingApiUrl = api.url;

        // Cleaner Lambda
        const cleanerLambda = new lambda.Function(this, 'CleanerLambda', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/cleaner'),
            environment: {
                BUCKET_NAME: bucket.bucketName
            }
        });
        bucket.grantReadWrite(cleanerLambda);

        // Driver Lambda
        this.driverLambda = new lambda.Function(this, 'DriverLambda', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/driver'),
            environment: {
                BUCKET_NAME: bucket.bucketName,
                API_URL: api.url
            }
        });
        bucket.grantReadWrite(this.driverLambda);
    }
}
