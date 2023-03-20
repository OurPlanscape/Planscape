import boto3
import requests
import rpy2
import rpy2.robjects as robjects
from rpy2.robjects.packages import importr

client = boto3.client('sqs', region_name='us-west-1')
QUEUE_URL = 'https://sqs.us-west-1.amazonaws.com/705618310400/forsys_output.fifo'
PLANSCAPE_URL = 'http://planscapedevload-1541713932.us-west-1.elb.amazonaws.com/planscape-backend/plan/update_scenario/'
PROCESSING_STATUS = "2"
SUCCESS_STATUS = "3"
FAILED_STATUS = "4"


def lambda_handler(event, context):
    try:
        plan_id = event['Records']['body']
        print("elsie0: " + str(plan_id))

        new_scenario = {
            'plan_id': plan_id,
            'priorities': ['biodiversity'],
            'weights': [1]
        }
        resp = requests.post(
            "http://planscapedevload-1541713932.us-west-1.elb.amazonaws.com/planscape-backend/plan/create_scenario/",
            json=new_scenario)

        print("elsie1")
        print(resp.text)
        scenario_id = resp.json()
        print("elsie2: " + str(scenario_id))
        processing = {
            'id': scenario_id,
            'status': PROCESSING_STATUS
        }
        resp = requests.patch(PLANSCAPE_URL, json=processing)
        print("elsie3 preforsys")
        r = robjects.r
        base = importr('base')
        utils = importr('utils')
        r.source('rank.R')
        r_f = robjects.r['times2']
        result = r_f(4)
        print("elsie4 post forsys")
        response = client.send_message(
            QueueUrl=QUEUE_URL,
            MessageBody=SUCCESS_STATUS,
            MessageGroupId="elsie"
        )

        return {
            'message': response['MessageId']
        }
    except Exception as e:
        response = client.send_message(
            QueueUrl=QUEUE_URL,
            MessageBody=FAILED_STATUS,
            MessageGroupId="elsie"
        )
        return {
            'message': str(e)
        }
