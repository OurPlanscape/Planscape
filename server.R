library(plumber)

readRenviron(".env")
source("src/planscape/rscripts/base_forsys.R")


# server.R

#* Echo back the input
#* @param msg The message to echo
#* @get /echo
function(msg="") {
  list(msg = paste0("The message is: '", msg, "'"))
}

#* Execute Forsys
#* @param scenario_id Scenario ID
#* @get /run_forsys
function(scenario_id=NULL) {
  if(is.null(scenario_id) || scenario_id == "") {
    list("You need to specify the scenario_id.")
  }
  tryCatch({
    scenario_id <- as.integer(scenario_id)
  }, error = function(e) {
    list("Scenario ID must be an integer.")
  })
  tryCatch({
    main(scenario_id)
    list("Forsys run completed.")
  }, error = function(e) {
    list("Forsys run failed.", error = e$message)
  })
}
