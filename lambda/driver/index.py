import os
import time
import requests
import boto3

s3 = boto3.client('s3')
bucket_name = os.environ['BUCKET_NAME']
api_url = os.environ['API_URL']

def handler(event, context):
    # Create assignment1.txt (19 bytes)
    s3.put_object(Bucket=bucket_name, Key='assignment1.txt', Body='Empty Assignment 1')
    print("Created assignment1.txt (19 bytes)")
    time.sleep(10)  # Wait to ensure metrics update

    # Create assignment2.txt (28 bytes)
    s3.put_object(Bucket=bucket_name, Key='assignment2.txt', Body='Empty Assignment 2222222222')
    print("Created assignment2.txt (28 bytes)")
    # Wait for alarm to fire and cleaner to delete assignment2.txt
    time.sleep(60)

    # Create assignment3.txt (2 bytes)
    s3.put_object(Bucket=bucket_name, Key='assignment3.txt', Body='33')
    print("Created assignment3.txt (2 bytes)")
    # Wait for alarm again
    time.sleep(60)

    # Call the plotting API
    response = requests.get(api_url)
    print(f"Plotting API response: {response.status_code}, {response.text}")

    return "Driver Lambda execution completed."
