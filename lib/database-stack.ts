import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DatabaseStack extends Stack {
    public readonly table: dynamodb.Table;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.table = new dynamodb.Table(this, 'S3ObjectSizeHistory', {
            tableName: 'S3-object-size-history',
            partitionKey: { name: 'BucketName', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'Timestamp', type: dynamodb.AttributeType.NUMBER },
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        this.table.addGlobalSecondaryIndex({
            indexName: 'BucketName-TotalSize-index',
            partitionKey: { name: 'BucketName', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'TotalSize', type: dynamodb.AttributeType.NUMBER },
            projectionType: dynamodb.ProjectionType.ALL,
        });
    }
}
