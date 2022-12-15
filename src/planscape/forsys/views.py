import logging
import numpy as np
import os
import pandas as pd
import rpy2

from django.conf import settings
from django.http import (HttpRequest, HttpResponse, HttpResponseBadRequest,
                         JsonResponse, QueryDict)

# Configure global logging.
logger = logging.getLogger(__name__)

# Gets query parameters for scenario_set
# TODO: clarify input parameters.
def get_target_value(params: QueryDict):
  assert isinstance(params['target_value'], str)
  target_value = int(params['target_value'])
  return target_value

# Converts R dataframe to Pandas dataframe.
# TODO: the broadly-accepted solution involves robjects.conversion.rpy2py - debug why it failed with an input type error.
def convert_rdf_to_pddf(rdf):
  pddf = pd.DataFrame.from_dict({ key : np.asarray(rdf.rx2(key)) for key in rdf.names })
  return pddf

# Returns JSon data for a forsys scenario set call.
def scenario_set(request: HttpRequest) -> HttpResponse:
  try:
    target_value = get_target_value(request.GET)
    import rpy2.robjects as robjects
    robjects.r.source(os.path.join(settings.BASE_DIR, 'forsys/dummy.R'))
    dummy_function_r = robjects.globalenv['dummy']

    analysis = dummy_function_r(target_value)

    # TODO: clarify output variables.
    response = {}
    for i in range(len(analysis)):
      pddata = convert_rdf_to_pddf(analysis[i])
      response['type_%d'%(i)] = pddata.to_json()
    return JsonResponse(response)
  except Exception as e:
    logger.error('forsys scenario set error: ' + str(e))
    return HttpResponseBadRequest("Ill-formed request: " + str(e))
