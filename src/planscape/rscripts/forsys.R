## How to run this script?
## From the planscape repo root, do:
## Rscript src/planscape/rscripts/forsys.R --scenario <scenario_id>
## Replace `<scenario_id>` with an integer, corresponding with the scenario id
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
      scores = list(11, 21, 31),
      stands = list(
        stand_1 = 11,
        stand_2 = 21,
        stand_3 = 32
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
  scenario_result <- list(
    now,
    now,
    scenario$id,
    "SUCCESS",
    toJSON(sample_json)
  )
  return(scenario_result)
}

upsert_scenario_result <- function(connection, result) {
  query <- "INSERT into planning_scenarioresult (
    created_at,
    updated_at,
    scenario_id,
    status,
    result
  ) VALUES (
    $1, $2, $3, $4, $5
  )
  ON CONFLICT (scenario_id) DO UPDATE
  SET
    updated_at = EXCLUDED.updated_at,
    result = EXCLUDED.result,
    status = EXCLUDED.status;
  "
  dbExecute(connection, query, result)
}

main <- function(scenario_id) {
  sprintf("Scenario chosen is %s", scenario_id)
  connection <- get_connection()
  scenario <- get_scenario_data(connection, scenario_id)
  result <- call_forsys(scenario)
  upsert_scenario_result(connection, result)
}

main(scenario_id)
