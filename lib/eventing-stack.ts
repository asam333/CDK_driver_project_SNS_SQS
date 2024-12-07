import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as s3 from 'aws-cdk-lib/aws-s3';

export interface EventingStackProps extends StackProps {
  bucket: s3.Bucket;
}

export class EventingStack extends Stack {
  public readonly s3EventsTopic: sns.Topic;
  public readonly sizeTrackingQueue: sqs.Queue;
  public readonly loggingQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: EventingStackProps) {
    super(scope, id, props);

    this.s3EventsTopic = new sns.Topic(this, 'S3EventsTopic');

    this.sizeTrackingQueue = new sqs.Queue(this, 'SizeTrackingQueue');
    this.loggingQueue = new sqs.Queue(this, 'LoggingQueue');

    this.s3EventsTopic.addSubscription(new subscriptions.SqsSubscription(this.sizeTrackingQueue));
    this.s3EventsTopic.addSubscription(new subscriptions.SqsSubscription(this.loggingQueue));

    // Add event notifications from the bucket to SNS
    props.bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.SnsDestination(this.s3EventsTopic));
    props.bucket.addEventNotification(s3.EventType.OBJECT_REMOVED, new s3n.SnsDestination(this.s3EventsTopic));
  }
}
