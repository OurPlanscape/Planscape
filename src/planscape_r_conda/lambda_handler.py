import rpy2
import rpy2.robjects as robjects
from rpy2.robjects.packages import importr

def lambda_handler(event, context):   
    try: 
        r=robjects.r
        base = importr('base')
        utils = importr('utils')
        r.source('rank.R')
        r_f = robjects.r['times2']
        result = r_f(4)
        return { 
            'message' : str(result)
        }
    except Exception as e:
        return { 
            'message' : str(e)
        }

