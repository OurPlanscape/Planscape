library(plumber)

# source("src/planscape/rscripts/forsys.R")

# server.R

#* Echo back the input
#* @param msg The message to echo
#* @get /echo
function(msg="") {
  list(msg = paste0("The message is: '", msg, "'"))
}

if (FALSE){
  #* Execute Forsys
  #* @param scenario_id Scenario ID
  #* @get /run_forsys2
  function(scenario_id=0) {
    if(scenario_id == 0) {
      stop("You need to specify the scenario_id.")
    }
    main(scenario_id)
  }
}