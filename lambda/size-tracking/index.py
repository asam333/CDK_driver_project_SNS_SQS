import boto3
import logging
from datetime import datetime
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')
dynamodb_resource = boto3.resource('dynamodb')
TABLE_NAME = os.environ['TABLE_NAME']
BUCKET_NAME = os.environ['BUCKET_NAME']

def lambda_handler(event, context):
    logger.info("Received event: %s", event)
    try:
        for record in event['Records']:
            bucket_name = record['s3']['bucket']['name']
            logger.info(f"Processing bucket: {bucket_name}")

            if bucket_name != BUCKET_NAME:
                logger.warning(f"Skipping bucket: {bucket_name}")
                continue

            # Compute total size and object count
            total_size, total_objects = get_bucket_size_and_count(bucket_name)

            # Store the data in DynamoDB
            store_data_in_dynamodb(bucket_name, total_size, total_objects)

        return {
            'statusCode': 200,
            'body': 'Processing complete.'
        }
    except Exception as e:
        logger.error(f"Error processing event: {e}")
        return {
            'statusCode': 500,
            'body': f'Error processing event: {e}'
        }

def get_bucket_size_and_count(bucket_name):
    total_size = 0
    total_objects = 0
    continuation_token = None
    
    while True:
        if continuation_token:
            response = s3_client.list_objects_v2(
                Bucket=bucket_name,
                ContinuationToken=continuation_token
            )
        else:
            response = s3_client.list_objects_v2(Bucket=bucket_name)
        
        if 'Contents' in response:
            for obj in response['Contents']:
                total_size += obj['Size']
                total_objects += 1
        else:
            # No objects in the bucket
            break
        
        # Check if there are more objects to list
        if response.get('IsTruncated'):
            continuation_token = response.get('NextContinuationToken')
        else:
            break
    
    print(f"Bucket: {bucket_name}, Total Size: {total_size}, Total Objects: {total_objects}")
    return total_size, total_objects

def store_data_in_dynamodb(bucket_name, total_size, total_objects):
    table = dynamodb_resource.Table(TABLE_NAME)
    timestamp = int(datetime.utcnow().timestamp())
    
    item = {
        'BucketName': bucket_name,
        'Timestamp': timestamp,
        'TotalSize': total_size,
        'TotalObjects': total_objects
    }
    
    # Write the item to DynamoDB
    response = table.put_item(Item=item)
    print(f"Data stored in DynamoDB: {item}")