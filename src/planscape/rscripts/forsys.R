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

get_stand_metrics <- function(connection, condition, stand_ids) {
  query <- glue_sql(
    "SELECT
      stand_id,
      avg as {`condition_name`}
     FROM stands_standmetric
     WHERE
       condition_id = {condition_id} AND
       stand_id IN ({stand_ids*}) AND
       avg is NOT NULL",
    condition_id = condition$condition_id,
    condition_name = condition$condition_name,
    stand_ids = stand_ids,
    .con = connection
  )
  result <- dbGetQuery(connection, query)
  return(result)
}

get_project_geometry <- function(connection, stand_ids) {
  query <- glue_sql("SELECT
            ST_AsGeoJSON(
              ST_Transform(
                ST_Union(geometry),
                4326),
              6, -- max precision
              0  -- output mode
            )
            FROM stands_stand
            WHERE id IN ({stand_ids*})",
    stand_ids = stand_ids,
    .con = connection
  )
  result <- dbGetQuery(connection, query)
  return(fromJSON(result$st_asgeojson))
}

get_project_ids <- function(forsys_output) {
  return(unique(forsys_output$project_output$proj_id))
}

to_project_data <- function(con, project_id, forsys_output) {
  project_stand_ids <- select(
    filter(
      forsys_output$stand_output,
      proj_id == project_id
    ),
    stand_id
  )
  project_stand_ids <- as.integer(project_stand_ids$stand_id)
  geometry <- get_project_geometry(con, project_stand_ids)
  properties <- as.list(
    filter(
      forsys_output$project_output,
      proj_id == project_id
    )
  )
  return(list(
    type = "Feature",
    properties = properties,
    geometry = geometry
  ))
}

to_projects <- function(con, forsys_output) {
  project_ids <- get_project_ids(forsys_output)
  projects <- list()
  for (project_id in project_ids) {
    project <- to_project_data(con, project_id, forsys_output)
    projects <- append(projects, list(project))
  }
  geojson <- list(type = "FeatureCollection", features = projects)
  return(geojson)
}

merge_data <- function(stands, metrics) {
  data <- merge(x = stands, y = metrics, by = "stand_id")
  return(data)
}

now_utc <- function() {
  strftime(as.POSIXlt(Sys.time(), "UTC"), "%Y-%m-%dT%H:%M:%S")
}

get_conditions <- function(connection, scenario, configuration) {
  conditions <- list()
  for (priority in configuration$priorities) {
    condition <- priority_to_condition(connection, scenario, priority)
    conditions[[condition$condition_name]] <- condition
  }
  return(conditions)
}

get_stand_data <- function(connection, scenario, conditions) {
  stands <- get_stands(connection, scenario$id)
  for (condition in conditions) {
    metric <- get_stand_metrics(
      connection,
      condition,
      stands$stand_id
    )
    stands <- merge_data(stands, metric)
  }

  return(stands)
}

get_configuration <- function(scenario) {
  configuration <- fromJSON(toString(scenario[["configuration"]]))
  return(configuration)
}

call_forsys <- function(connection, scenario) {
  now <- now_utc()
  configuration <- get_configuration(scenario)
  conditions <- get_conditions(connection, scenario, configuration)
  stand_data <- get_stand_data(connection, scenario, conditions)

  if (length(names(conditions)) > 1) {
    stand_data <- stand_data %>% forsys::combine_priorities(
      fields = names(conditions),
      weights = configuration$weights,
      new_field = "priority"
    )
    scenario_priorities <- c("priority")
  } else {
    scenario_priorities <- names(conditions)
  }

  out <- forsys::run(
    return_outputs = TRUE,
    write_outputs = TRUE,
    overwrite_output = TRUE,
    scenario_name = scenario$name,
    scenario_output_fields = c(scenario_priorities, "area_ha"),
    scenario_priorities = scenario_priorities,
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
  return(out)
}

to_result <- function(connection, scenario, forsys_output) {
  now <- now_utc()
  result <- to_projects(connection, forsys_output)

  scenario_result <- list(
    now,
    now,
    scenario$id,
    "SUCCESS",
    result
  )
  return(scenario_result)
}

upsert_scenario_result <- function(
    connection,
    timestamp,
    scenario_id,
    status,
    result) {
  query <- glue_sql("INSERT into planning_scenarioresult (
    created_at,
    updated_at,
    scenario_id,
    status,
    result
  ) VALUES (
    {timestamp},
    {timestamp},
    {scenario_id},
    {status},
    {result}
  )
  ON CONFLICT (scenario_id) DO UPDATE
  SET
    updated_at = EXCLUDED.updated_at,
    result = EXCLUDED.result,
    status = EXCLUDED.status;
  ",
    timestamp = timestamp,
    scenario_id = scenario_id,
    status = status,
    result = result,
    .con = connection
  )
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
