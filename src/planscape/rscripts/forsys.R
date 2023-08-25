library("DBI")
library("RPostgreSQL")
library("optparse")
library("dbplyr")

readRenviron("src/planscape/planscape/.env")

options <- list(
  make_option(
    c("-s", "--scenario",
      type = "character", default = NULL,
      help = "Scenario ID", metavar = "character"
    )
  )
)
parser <- OptionParser(option_list = options)
options <- parse_args(parser)
scenario_id <- options$scenario
if (is.null(scenario_id)) {
  print_help(parser)
  stop("You need to specify one scenario id.")
}

get_connection <- function() {
  connection <- dbConnect(RPostgres::Postgres(),
    host = Sys.getenv("PLANSCAPE_DATABASE_HOST"),
    dbname = Sys.getenv("PLANSCAPE_DATABASE_NAME"),
    port = Sys.getenv("PLANSCAPE_DATABASE_PORT"),
    user = Sys.getenv("PLANSCAPE_DATABASE_USER"),
    password = Sys.getenv("PLANSCAPE_DATABASE_PASSWORD"),
  )
  return(connection)
}

get_scenario_data <- function(scenario_id) {
  my_scenario <- list(
    planning_area_id = 1,
    scenario_id = scenario_id,
    name = "my scenario",
    notes = "my notes",
    configuration = list(foo = "bar", bar = "baz")
  )
  return(my_scenario)
}


now_utc <- function() {
  strftime(as.POSIXlt(Sys.time(), "UTC"), "%Y-%m-%dT%H:%M:%S")
}


call_forsys <- function(scenario) {
  now <- now_utc()
  # call forsys

  scenario_result <- list(
    now,
    now,
    scenario$scenario_id,
    "SUCCESS"
  )
  return(scenario_result)
}

create_scenario_result <- function(connection, result) {
  query <- "INSERT INTO planning_scenarioresult (
    created_at,
    updated_at,
    scenario_id,
    status)
  VALUES ($1, $2, $3, $4)"
  rs <- dbSendStatement(connection, query, params = result)
  dbClearResult(rs)
}

main <- function(scenario_id) {
  sprintf("Scenario chosen is %s", scenario_id)
  connection <- get_connection()
  scenario <- get_scenario_data(scenario_id)
  result <- call_forsys(scenario)
  create_scenario_result(connection, result)
  dbReadTable(connection, "planning_scenarioresult")
}

main(scenario_id)
