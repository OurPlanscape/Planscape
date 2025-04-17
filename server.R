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
function(scenario_id=0) {
  if(scenario_id == 0) {
    list("You need to specify the scenario_id.")
    400
  }
  main(scenario_id)
}
