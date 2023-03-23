import boto3
import requests
import json
import rpy2
import rpy2.robjects as robjects
from rpy2.robjects.packages import importr

client = boto3.client('sqs', region_name='us-west-1')
QUEUE_URL = 'https://sqs.us-west-1.amazonaws.com/705618310400/forsys_output.fifo'
PLANSCAPE_URL = 'http://planscapedevload-1541713932.us-west-1.elb.amazonaws.com/planscape-backend/plan/update_scenario/'
PROCESSING_STATUS = 2
SUCCESS_STATUS = "3"
FAILED_STATUS = "4"


def lambda_handler(event, context):
    try:
        body = event['Records'][0]['body']
        parsed = json.loads(body)
        plan_id = parsed['plan_id']
        project_id = parsed['project_id']

        print("plan_id: " + plan_id)
        print("project_id: " + project_id)

        # TODO: add project_id in create scenario call
        scenario = {
            'plan_id': int(plan_id),
            'priorities': ['biodiversity'],
            'weights': [1]
        }
        resp = requests.post(
            "http://planscapedevload-1541713932.us-west-1.elb.amazonaws.com/planscape-backend/plan/create_scenario/",
            json=scenario)
        print(resp.text)
        scenario_id = resp.json()
        print("created scenario id: " + str(scenario_id))

        processing = {
            'id': scenario_id,
            'status': PROCESSING_STATUS
        }
        resp = requests.patch(PLANSCAPE_URL, json=processing)
        print(resp.text)
        print("updated scenario to processing state: " + str(scenario_id))

        # TODO: return a set of generated project areas for TCSI region for visualization
        print("start forsys run")
        r = robjects.r
        base = importr('base')
        utils = importr('utils')
        r.source('rank.R')
        r_f = robjects.r['times2']
        result = r_f(4)
        print(result)
        print("forsys run completed")

        # rdf = "placeholder read the dataframe from a file"
        # forsys_project_output_df : dict[str, list] = {
        #     key: np.asarray(rdf.rx2(key)) for key in rdf.names}
        # print(forsys_project_output_df.keys())

        forsys_results = {
            'status': SUCCESS_STATUS,
            'project_id': str(project_id),
            'scenario_id': str(scenario_id),
        }

        # TODO: pick a meaningful value for MessageGroupId
        response = client.send_message(
            QueueUrl=QUEUE_URL,
            MessageBody=json.dumps(forsys_results),
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
