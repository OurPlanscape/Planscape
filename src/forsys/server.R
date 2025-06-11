library("logger")
library(plumber)
library("DBI")
library("dplyr")
library("forsys")
library("friendlyeval")
library("glue")
library("import")
library("logger")
library("optparse")
library("purrr")
library("rjson")
library("RPostgreSQL")
library("sf")
library("stringi")
library("tidyr")
library("uuid")

readRenviron("../../.env")
source("../planscape/rscripts/io_processing.R")
source("../planscape/rscripts/queries.R")
source("../planscape/rscripts/constants.R")
source("../planscape/rscripts/base_forsys.R")
source("../planscape/rscripts/postprocessing.R")

# server.R

#* Echo back the input
#* @param msg The message to echo
#* @get /echo
function(msg="") {
  list(msg = paste0("The message is: '", msg, "'"))
}

#* Execute Forsys
#* @param scenario_id Scenario ID
#* @post /run_forsys
function(res, req, scenario_id=NULL) {
  log_info("Run forsys {scenario_id}")
  if(is.null(scenario_id) || scenario_id == "") {
    res$status <- 400
    return(list(error = "You need to specify the scenario_id."))
  }
  tryCatch({
    scenario_id <- as.integer(scenario_id)
  }, error = function(e) {
    res$status <- 400
    return(list(error = "Scenario ID must be an integer."))
  })
  tryCatch({
    main(scenario_id)
    return(list("Forsys run completed."))
  }, error = function(e) {
    res$status <- 500
    return(list("Forsys run failed.", error = e$message))
  })
}
