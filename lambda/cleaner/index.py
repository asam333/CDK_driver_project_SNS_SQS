import os
import boto3

BUCKET_NAME = os.environ['BUCKET_NAME']
s3 = boto3.client('s3')

def handler(event, context):
    largest = None
    continuation_token = None

    while True:
        resp = s3.list_objects_v2(Bucket=BUCKET_NAME, ContinuationToken=continuation_token)
        if 'Contents' in resp:
            for obj in resp['Contents']:
                if largest is None or obj['Size'] > largest['Size']:
                    largest = obj

        if resp.get('IsTruncated'):
            continuation_token = resp['NextContinuationToken']
        else:
            break

    if largest:
        print(f"Deleting largest object: {largest['Key']} ({largest['Size']} bytes)")
        s3.delete_object(Bucket=BUCKET_NAME, Key=largest['Key'])
    else:
        print("No objects found to delete.")

    return {"status": "done"}
