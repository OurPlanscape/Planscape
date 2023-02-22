import rpy2.robjects as robjects

def lambda_handler(event, context): 
    r=robjects.r
    r.source('rank.R')
    r_f = robjects.r['times2']
    result = r_f(4)
    return { 
        'message' : result
    }