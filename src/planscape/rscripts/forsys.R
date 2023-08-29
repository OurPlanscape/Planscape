library("DBI")
library("RPostgreSQL")
library("optparse")
library("rjson")

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

get_scenario_data <- function(connection, scenario_id) {
  query <- "SELECT * FROM planning_scenario WHERE id = $1;"
  result <- dbGetQuery(connection, query, params = list(scenario_id))
  return(head(result, 1))
}


now_utc <- function() {
  strftime(as.POSIXlt(Sys.time(), "UTC"), "%Y-%m-%dT%H:%M:%S")
}


call_forsys <- function(scenario) {
  now <- now_utc()
  configuration <- fromJSON(toString(scenario["configuration"]))

  print("Calling FORSYS")
  print("scenario")
  print(scenario)
  print("configuration")
  print(configuration)

  sample_json <- list(
    result = list(
      scores = list(10, 20, 30),
      stands = list(
        stand_1 = 10,
        stand_2 = 20,
        stand_3 = 30
      )
    )
  )

  scenario_result <- data.frame(
    created_at = now,
    updated_at = now,
    scenario_id = scenario$id,
    status = "SUCCESS",
    result = toJSON(sample_json)
  )
  return(scenario_result)
}

create_scenario_result <- function(connection, result) {
  dbWriteTable(
    connection, c("planning_scenarioresult"),
    value = result,
    append = TRUE,
    row.names = FALSE
  )
}

main <- function(scenario_id) {
  sprintf("Scenario chosen is %s", scenario_id)
  connection <- get_connection()
  scenario <- get_scenario_data(connection, scenario_id)
  result <- call_forsys(scenario)
  create_scenario_result(connection, result)
}

main(scenario_id)
