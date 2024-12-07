import boto3
import matplotlib.pyplot as plt
import io
from datetime import datetime, timedelta
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

TABLE_NAME = os.environ['TABLE_NAME']
BUCKET_NAME = os.environ['BUCKET_NAME']

def lambda_handler(event, context):
    #query data for 10s
    now = int(datetime.utcnow().timestamp())
    ten_seconds_ago = now - 10
    table = dynamodb.Table(TABLE_NAME)
    response = table.query(
        KeyConditionExpression=Key('BucketName').eq(BUCKET_NAME) & Key('Timestamp').between(ten_seconds_ago, now)
    )
    
    #prepare the plotting value
    items = response['Items']
    timestamps = [int(item['Timestamp']) for item in items]
    sizes = [int(item['TotalSize']) for item in items]
    
    #Retrieve the max size
    response = table.query(
        IndexName = 'BucketName-TotalSize-index',
        KeyConditionExpression=Key('BucketName').eq(BUCKET_NAME),
        ScanIndexForward=False,
        Limit=1
    )
    max_size_item = response['Items'][0] if response['Items'] else None
    max_size = int(max_size_item['TotalSize']) if max_size_item else 0
    
    #plot the data
    plt.figure()
    plt.plot(timestamps, sizes, marker='o', label='Bucket Size')
    plt.axhline(y=max_size, color='r', linestyle='--', label='Max Size')
    plt.xlabel('Timestamp')
    plt.ylabel('Size (bytes)')
    plt.title('Bucket Size Over Time')
    plt.legend()
    
    #save the plot to In-Memory Buffer
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)
    
    #upload to S3
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key='plot',
        Body=buffer,
        ContentType='image/png'
    )
    
    return {
        'statusCode': 200,
        'body': 'Plot successfully generated and uploaded to S3.'
    }



