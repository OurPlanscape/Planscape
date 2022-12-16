#' R API for hosting ForSysR
#' 
#' Run this script to launch an R API and listen for HTTP requests.
#' You can launch it using RScript from the command line. Endpoint expects
#' POST method with json body for the raster data. The endpoint path can be
#' used to differentiate between ForSysR call 1 (a.k.a Patchmax run)
#' and ForSysR call 2 (a.k.a treatment run).

library(plumber)

# TODO: may have to adapt path!
plumber::plumb('Planscape/src/planscape/forsys/forsysr_functions.R') %>%
  # specify your port here
  pr_run(port = 70042)