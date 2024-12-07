#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Proj4Stack } from '../lib/proj4-stack';
import { BucketStack } from '../lib/bucket-stack';
import { DatabaseStack } from '../lib/database-stack';
import { EventingStack } from '../lib/eventing-stack';
import { LambdaStack } from '../lib/lambda-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

const app = new cdk.App();

const bucketStack = new BucketStack(app, 'BucketStack');
const databaseStack = new DatabaseStack(app, 'DatabaseStack');

const eventingStack = new EventingStack(app, 'EventingStack', {
  bucket: bucketStack.testBucket
});

const lambdaStack = new LambdaStack(app, 'LambdaStack', {
  table: databaseStack.table,
  bucket: bucketStack.testBucket,
  sizeTrackingQueue: eventingStack.sizeTrackingQueue,
  loggingQueue: eventingStack.loggingQueue
});

new MonitoringStack(app, 'MonitoringStack', {
  loggingLambdaLogGroupName: lambdaStack.loggingLambdaLogGroupName,
  cleanerLambda: lambdaStack.node.tryFindChild('CleanerLambda') as any // reference cleaner lambda from lambdaStack
});