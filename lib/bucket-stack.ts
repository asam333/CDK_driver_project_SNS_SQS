import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

export interface BucketStackProps extends StackProps { }

export class BucketStack extends Stack {
    public readonly testBucket: s3.Bucket;

    constructor(scope: Construct, id: string, props?: BucketStackProps) {
        super(scope, id, props);

        this.testBucket = new s3.Bucket(this, 'TestBucket', {
            bucketName: 'testbucke0tkiita0130',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true
        });
    }
}
