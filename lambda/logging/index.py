import os
import json
import boto3

logs_client = boto3.client('logs')
s3 = boto3.client('s3')

LOG_GROUP_NAME = os.environ['LOG_GROUP_NAME']
REGION = os.environ['REGION']

def handler(event, context):
    for record in event['Records']:
        msg = json.loads(record['body'])
        # SNS -> S3 Event structure
        s3_record = msg['Records'][0]
        event_name = s3_record['eventName']
        object_key = s3_record['s3']['object']['key']
        bucket_name = s3_record['s3']['bucket']['name']

        if event_name.startswith("ObjectCreated"):
            # Get size from event or s3 head
            object_size = s3_record['s3']['object'].get('size')
            if object_size is None:
                # fallback: head the object
                resp = s3.head_object(Bucket=bucket_name, Key=object_key)
                object_size = resp['ContentLength']
            log_entry = {
                "object_name": object_key,
                "size_delta": object_size
            }
            print(json.dumps(log_entry))

        elif event_name.startswith("ObjectRemoved"):
            # Need to find old size from logs
            # We'll search for a creation log for this object:
            events = logs_client.filter_log_events(
                logGroupName=LOG_GROUP_NAME,
                filterPattern=f'"object_name": "{object_key}" "size_delta":'
            )

            original_size = 0
            for e in events.get('events', []):
                line = e['message']
                try:
                    data = json.loads(line)
                    # positive size_delta means creation event
                    if data.get("object_name") == object_key and data.get("size_delta", 0) > 0:
                        original_size = data["size_delta"]
                        break
                except:
                    pass

            log_entry = {
                "object_name": object_key,
                "size_delta": -original_size
            }
            print(json.dumps(log_entry))
