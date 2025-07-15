library("logger")
library(plumber)

readRenviron("../../.env")

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
    FORSYS_PATCHMAX_WD <- Sys.getenv("FORSYS_PATCHMAX_WD", "/usr/src/app/src/planscape/")
    setwd(FORSYS_PATCHMAX_WD)
    system("Rscript rscripts/forsys.R --scenario " %>% 
           glue::glue(scenario_id), intern = FALSE, wait = FALSE)
    res$status <- 202
    return(list("Forsys run triggered."))
  }, error = function(e) {
    res$status <- 500
    log_error("Forsys run failed: {e}")
    return(list("Forsys run failed.", error = e$message))
  })
}
