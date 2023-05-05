#!/usr/bin/env python3

import os
import rpy2.robjects as robjects
from rpy2.robjects.packages import importr
from rpy2.rinterface_lib import openrlib
import rpy2.situation


def call_r(x):
    """
    Takes a number and calls the R function
    """
    r = robjects.r
    base = importr("base")
    print(base._libPaths())
    r.source("rank.R")
    r_f = robjects.r["times2"]
    return r_f(x)


def lambda_handler(event, context):
    c = get_config()
    libpath = os.environ.get("LD_LIBRARY_PATH", "")
    os.environ["LD_LIBRARY_PATH"] = (
        rpy2.situation.r_ld_library_path_from_subprocess(openrlib.R_HOME) + libpath
    )

    call_r(4)
    r = robjects.r
    base = importr("base")
    print(base._libPaths())
    r.source("rank.R")
    r_f = robjects.r["times2"]
    result = r_f(4)
    return {"message": str(result)}


if __name__ == "__main__":
    result = call_r(4)
    print(result)
