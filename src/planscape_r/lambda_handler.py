import rpy2.robjects as robjects
from rpy2.robjects.packages import importr

def lambda_handler(event, context): 
    r=robjects.r
    base = importr('base')
    print(base._libPaths())
    r.source('rank.R')
    r_f = robjects.r['times2']
    result = r_f(4)
    return { 
        'message' : str(result)
    }
