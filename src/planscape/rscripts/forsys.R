## How to run this script?
## From the planscape repo root, do:
## Rscript src/planscape/rscripts/forsys.R --scenario <scenario_id>
## Replace `<scenario_id>` with an integer, corresponding with the scenario id
library("DBI")
library("RPostgreSQL")
library("optparse")
library("rjson")
library("glue")
library("forsys")
library("sf")
library("dplyr")

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
  query <- "SELECT
              s.id,
              s.name,
              s.configuration,
              pa.region_name as \"region_name\",
              pa.name as \"planning_area_name\"
            FROM
              planning_scenario s
            LEFT JOIN planning_planningarea pa ON (pa.id = s.planning_area_id)
            WHERE s.id = $1;"
  result <- dbGetQuery(connection, query, params = list(scenario_id))
  return(head(result, 1))
}

priority_to_condition <- function(connection, scenario, priority) {
  region_name <- scenario$region_name
  # given a scenario and it's configuration, return
  # a list of condition ids
  query <- glue_sql(
    "SELECT
      cc.id as \"condition_id\",
      cb.id as \"base_id\",
      cb.region_name,
      cb.condition_name
    FROM
      conditions_condition cc
    LEFT JOIN
      conditions_basecondition cb ON (cb.id = cc.condition_dataset_id)
    WHERE
      cb.condition_name = {condition_name} AND
      cb.region_name = {region_name}",
    condition_name = priority,
    region_name = region_name,
    .con = connection
  )
  result <- dbGetQuery(connection, query)
  return(head(result, 1))
}

get_stands <- function(connection, scenario_id) {
  query_text <- "
  WITH plan_scenario AS (
    SELECT
      pp.id as \"planning_area_id\",
      ps.id as \"scenario_id\",
      pp.geometry
  FROM planning_planningarea pp
  LEFT JOIN planning_scenario ps ON (ps.planning_area_id = pp.id)
  WHERE
      ps.id = {scenario_id}
  )
  SELECT
      ss.id as \"stand_id\",
      ST_Transform(ss.geometry, 3310) as \"geometry\",
      ss.area_m2 / 10000 as \"area_ha\"
  FROM stands_stand ss, plan_scenario
  WHERE
      ss.geometry && plan_scenario.geometry AND
      ST_Intersects(ss.geometry, plan_scenario.geometry)"
  query <- glue_sql(query_text, scenario_id = scenario_id, .con = connection)

  result <- st_read(
    dsn = connection,
    layer = NULL,
    query = query,
    geometry_column = "geometry"
  )
  return(result)
}

get_column_name <- function(condition_id) {
  return(paste("condition", condition_id, sep = "_"))
}

rename_column <- function(dataframe, original, destination) {
  colnames(dataframe)[colnames(dataframe) == "avg"] <- destination
}

get_stand_metrics <- function(connection, condition_id, stand_ids) {
  query <- glue_sql(
    "SELECT
      stand_id,
      avg
     FROM stands_standmetric
     WHERE
       condition_id = {condition_id} AND
       stand_id IN ({stand_ids*}) AND
       avg is NOT NULL",
    condition_id = condition_id,
    stand_ids = stand_ids,
    .con = connection
  )
  result <- dbGetQuery(connection, query)
  return(result)
}

merge_data <- function(stands, metrics) {
  data <- merge(x = stands, y = metrics, by = "stand_id")
  return(data)
}

now_utc <- function() {
  strftime(as.POSIXlt(Sys.time(), "UTC"), "%Y-%m-%dT%H:%M:%S")
}

get_stand_data <- function(connection, scenario, configuration) {
  stands <- get_stands(connection, scenario$id)
  print(stands)
  for (priority in configuration$priorities) {
    print(priority)
    condition <- priority_to_condition(
      connection,
      scenario,
      priority
    )
    print("condition")
    print(condition)
    metric <- get_stand_metrics(
      connection,
      condition$condition_id,
      stands$stand_id
    )
    print(metric)
    stands <- merge_data(stands, metric)
  }

  return(stands)
}

call_forsys <- function(connection, scenario, condition_id) {
  now <- now_utc()
  configuration <- fromJSON(toString(scenario[["configuration"]]))

  stand_data <- get_stand_data(connection, scenario, configuration)

  out <- forsys::run(
    return_outputs = TRUE,
    write_outputs = TRUE,
    overwrite_output = TRUE,
    scenario_name = scenario$name,
    scenario_output_fields = c("area_ha", "avg"),
    scenario_priorities = c("avg"),
    stand_data = stand_data,
    stand_area_field = "area_ha",
    stand_id_field = "stand_id",
    run_with_patchmax = TRUE,
    patchmax_proj_size = 6000,
    patchmax_proj_size_min = 1000,
    patchmax_proj_number = 5,
    patchmax_SDW = 0.5,
    patchmax_EPW = 1,
    patchmax_sample_frac = 0.1,
    annual_target_field = "area_ha",
    annual_target = 100000
  )

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
