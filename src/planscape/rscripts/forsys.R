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
library("purrr")

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

COST_PER_ACRE <- Sys.getenv("PLANSCAPE_COST_PER_ACRE", unset = 2470)

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
              pa.name as \"planning_area_name\",
              ST_Area(pa.geometry::geography, TRUE) / 4047 as \"planning_area_acres\"
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
      pp.id AS \"planning_area_id\",
      ps.id AS \"scenario_id\",
      pp.geometry
  FROM planning_planningarea pp
  LEFT JOIN planning_scenario ps ON (ps.planning_area_id = pp.id)
  WHERE
      ps.id = {scenario_id}
  )
  SELECT
      ss.id AS \"stand_id\",
      ST_Transform(ss.geometry, 5070) AS \"geometry\",
      ST_Area(ss.geometry::geography, TRUE) / 4047 as \"area_acres\"
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

get_stand_metrics <- function(
    connection,
    condition_id,
    condition_name,
    stand_ids) {
  query <- glue_sql(
    "SELECT
      stand_id,
      avg as {`condition_name`}
     FROM stands_standmetric
     WHERE
       condition_id = {condition_id} AND
       stand_id IN ({stand_ids*}) AND
       avg is NOT NULL",
    condition_id = condition_id,
    condition_name = condition_name,
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

rename_col <- function(name) {
  new_name <- gsub(
    "^(Pr_[0-9]+_|ETrt_)",
    "",
    name
  )
  return(new_name)
}

to_properties <- function(
    project_id,
    scenario,
    forsys_project_outputs) {
  project_data <- forsys_project_outputs %>%
    filter(proj_id == project_id) %>%
    mutate(cost_per_acre = ETrt_area_acres * COST_PER_ACRE) %>%
    mutate(pct_area = ETrt_area_acres / scenario$planning_area_acres) %>%
    rename_with(.fn = rename_col)
  return(as.list(project_data))
}

to_project_data <- function(
    connection,
    scenario,
    project_id,
    forsys_outputs) {
  project_stand_ids <- select(
    filter(
      forsys_outputs$stand_output,
      proj_id == project_id
    ),
    stand_id
  )
  project_stand_ids <- as.integer(project_stand_ids$stand_id)
  geometry <- get_project_geometry(connection, project_stand_ids)
  properties <- to_properties(
    project_id,
    scenario,
    forsys_project_outputs = forsys_outputs$project_output
  )
  return(list(
    type = "Feature",
    properties = properties,
    geometry = geometry
  ))
}

to_projects <- function(con, scenario, forsys_outputs) {
  project_ids <- get_project_ids(forsys_outputs)
  projects <- list()
  projects <- lapply(project_ids, function(project_id) {
    return(to_project_data(
      con,
      scenario,
      project_id,
      forsys_outputs
    ))
  })
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

get_priorities <- function(
    connection,
    scenario,
    configuration,
    key = "scenario_priorities") {
  priorities <- list()
  for (priority in configuration[[key]]) {
    condition <- priority_to_condition(connection, scenario, priority)
    priorities <- append(priorities, list(condition))
  }
  return(as.data.frame(priorities))
}

get_stand_data <- function(connection, scenario, conditions) {
  stands <- get_stands(connection, scenario$id)

  for (row in seq_len(nrow(conditions))) {
    condition_id <- conditions[row, "condition_id"]
    condition_name <- conditions[row, "condition_name"]
    metric <- get_stand_metrics(
      connection,
      condition_id,
      condition_name,
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

call_forsys <- function(
    connection,
    scenario,
    configuration,
    priorities,
    outputs) {
  forsys_inputs <- rbind(priorities, outputs)
  stand_data <- get_stand_data(connection, scenario, forsys_inputs)

  if (length(priorities$condition_name) > 1) {
    stand_data <- stand_data %>% forsys::combine_priorities(
      fields = priorities$condition_name,
      weights = configuration$weights,
      new_field = "priority"
    )
    scenario_priorities <- c("priority")
  } else {
    scenario_priorities <- first(priorities$condition_name)
  }
  # this might be configurable in the future. if it's the case, it will come in
  # the configuration variable. This also might change due the course of the
  # project as we're not sure on how many projects we will have at the beginning
  number_of_projects <- 5
  min_area <- configuration$max_treatment_area_ratio
  max_area <- min_area * number_of_projects
  out <- forsys::run(
    return_outputs = TRUE,
    write_outputs = TRUE,
    overwrite_output = TRUE,
    scenario_name = scenario$name,
    scenario_output_fields = c(outputs$condition_name, "area_acres"),
    scenario_priorities = scenario_priorities,
    stand_data = stand_data,
    stand_area_field = "area_acres",
    stand_id_field = "stand_id",
    run_with_patchmax = TRUE,
    patchmax_proj_size = max_area,
    patchmax_proj_size_min = min_area,
    patchmax_proj_number = number_of_projects,
    patchmax_SDW = 0.5,
    patchmax_EPW = 1,
    patchmax_sample_frac = 0.1,
    annual_target_field = "area_acres",
    annual_target = 100000
  )
  return(out)
}

upsert_scenario_result <- function(
    connection,
    timestamp,
    scenario_id,
    status,
    geojson_result) {
  query <- glue_sql("INSERT into planning_scenarioresult (
    created_at,
    updated_at,
    scenario_id,
    status,
    result
  ) VALUES (
    {created_at},
    {updated_at},
    {scenario_id},
    {status},
    {geojson_result}::jsonb
  )
  ON CONFLICT (scenario_id) DO UPDATE
  SET
    updated_at = EXCLUDED.updated_at,
    result = EXCLUDED.result,
    status = EXCLUDED.status;
  ",
    created_at = timestamp,
    updated_at = timestamp,
    scenario_id = scenario_id,
    status = status,
    geojson_result = toJSON(geojson_result),
    .con = connection
  )
  dbExecute(connection, query, immediate = TRUE)
}

main <- function(scenario_id) {
  now <- now_utc()
  connection <- get_connection()
  scenario <- get_scenario_data(connection, scenario_id)
  configuration <- get_configuration(scenario)
  priorities <- get_priorities(connection, scenario, configuration)
  outputs <- get_priorities(
    connection,
    scenario,
    configuration,
    key = "scenario_output_fields"
  )

  forsys_output <- call_forsys(
    connection,
    scenario,
    configuration,
    priorities,
    outputs
  )

  result <- to_projects(connection, scenario, forsys_output)
  upsert_scenario_result(connection, now, scenario_id, "SUCCESS", result)
}

main(scenario_id)
