## How to run this script?
## From the planscape repo root, do:
## Rscript rscripts/forsys.R --scenario <scenario_id>
## Replace `<scenario_id>` with an integer, corresponding with the scenario id
library("logger")
library("DBI")
library("RPostgreSQL")
library("optparse")
library("rjson")
library("glue")
library("forsys")
library("sf")
library("dplyr")
library("purrr")
library("stringi")
library("glue")
library("tidyr")
library("friendlyeval")
library("uuid")
library("featureflag")

# do not use spherical geometries
sf_use_s2(FALSE)
readRenviron("../../.env")

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

DEFAULT_COST_PER_ACRE <- 2470
SHORT_TONS_ACRE_TO_SHORT_TONS_CELL <- 0.2224
MGC_HA_TO_MGC_CELL <- 0.09
PREPROCESSING_MULTIPLIERS <- list(
  total_fuel_exposed_to_fire = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  dead_and_down_fuels = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  standing_dead_and_ladder_fuels = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  available_standing_biomass = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  sawtimber_biomass = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  costs_of_potential_treatment_moving_biomass = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  costs_of_potential_treatment_moving_sawlogs = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  heavy_fuel_load = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  live_tree_density_30in_dbh = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  aboveground_live_tree_carbon = MGC_HA_TO_MGC_CELL
)

STAND_AREAS_ACRES <- list(
  SMALL = 9.884,
  MEDIUM = 98.84,
  LARGE = 494.2
)

stand_metrics_with_datalayer <- create_bool_feature_flag(
  value = as.logical(Sys.getenv("FF_STAND_METRICS_WITH_DATALAYER", "False"))
)

average_per_stand <- function(value, stand_count, stand_size = NA, metric = NA) {
  return(round(value / stand_count, digits = 2))
}

average_and_clamp <- function(value, stand_count, stand_size = NA, metric = NA) {
  categories <- CATEGORIES_PER_METRIC[[metric]]
  average <- value / stand_count
  result <- abs(categories - average) %>%
    which.min() %>%
    categories[.]
  return(result)
}

total_acres_per_project <- function(value, stand_count, stand_size, metric = NA) {
  stand_size_in_acres <- STAND_AREAS_ACRES[[stand_size]]
  return(round(value * stand_size_in_acres, digits = 2))
}

CATEGORIES_PER_METRIC <- list(
  potential_total_smoke = c(0.12, 0.25, 0.35),
  american_indian_alaska_native_concentration = seq(0, 8),
  asian_concentration = seq(0, 8),
  black_african_concentration = seq(0, 8),
  damage_potential_wui = seq(0, 5),
  hispanic_black_indigenous_concentration = seq(0, 6),
  hispano_latino_concentration = seq(0, 7),
  low_income_population = seq(0, 9),
  structure_exposure = seq(1, 10),
  structure_exposure_score = seq(1, 10),
  wetland_diversity = seq(1, 8),
  wui_damage_potential = seq(0, 5),
  wildland_urban_interface = seq(0, 2)
)

POSTPROCESSING_FUNCTIONS <- list(
  aboveground_carbon_turnover_time = average_per_stand,
  aboveground_live_tree_carbon = average_per_stand,
  american_indian_alaska_native_concentration = average_and_clamp,
  american_indian_lands = total_acres_per_project,
  american_pacific_marten_habitat = total_acres_per_project,
  annual_burn_probability = average_per_stand,
  aquatic_species_richness = average_per_stand,
  asian_concentration = average_and_clamp,
  available_standing_biomass = total_acres_per_project,
  band_tailed_pigeon_habitat = total_acres_per_project,
  basal_area = average_per_stand,
  black_african_concentration = average_and_clamp,
  california_red_legged_frog = total_acres_per_project,
  california_spotted_owl_habitat = total_acres_per_project,
  california_spotted_owl_territory = total_acres_per_project,
  cavity_nesters_excavators_species_richness = average_per_stand,
  chinook_salmon_critical_habitat = total_acres_per_project,
  coastal_california_gnatcatcher = average_per_stand,
  coho_salmon_critical_habitat = total_acres_per_project,
  cost_of_potential_treatments = average_per_stand,
  damage_potential_wui = average_and_clamp,
  dead_and_down_carbon = average_per_stand,
  dead_and_down_fuels = average_per_stand,
  ember_load_index = average_per_stand,
  endangered_vertebrate = average_per_stand,
  giant_sequoia_stands = total_acres_per_project,
  heavy_fuel_load = average_per_stand,
  hermes_copper_butterfly = total_acres_per_project,
  hispanic_black_indigenous_concentration = average_and_clamp,
  hispano_latino_concentration = average_and_clamp,
  housing_burden_percentile = average_per_stand,
  housing_unit_density = average_per_stand,
  hummingbirds_species_richness = average_per_stand,
  joshua_tree = total_acres_per_project,
  least_bells_virio_habitat = total_acres_per_project,
  live_tree_density_30in_dbh = average_per_stand,
  loggerhead_shrike_habitat = total_acres_per_project,
  low_income_population = average_and_clamp,
  mean_percent_fire_return_interval_departure_condition_class = average_per_stand,
  mountain_lion = total_acres_per_project,
  mountain_yellow_legged_frog = total_acres_per_project,
  nothern_goshawk_habitat = total_acres_per_project,
  nuttails_woodpecker_habitat = total_acres_per_project,
  open_habitat_raptors_species_richness = average_per_stand,
  pacific_fisher = total_acres_per_project,
  percent_impervious_surface = average_per_stand,
  potential_total_smoke = average_and_clamp,
  poverty_percentile = average_per_stand,
  predicted_ignition_probability_human_caused = average_per_stand,
  predicted_ignition_probability_lightning_caused = average_per_stand,
  probability_of_fire_severity_high = average_per_stand,
  probability_of_fire_severity_moderate = average_per_stand,
  ringtail_cat_habitat = total_acres_per_project,
  riparian_habitat = total_acres_per_project,
  sawtimber_biomass = total_acres_per_project,
  standing_dead_and_ladder_fuels = average_per_stand,
  steelhead_critical_habitat = total_acres_per_project,
  structure_exposure = average_and_clamp,
  structure_exposure_score = average_and_clamp,
  threatened_endangered_vertebrate_species_richness = average_per_stand,
  time_since_last_disturbance = average_per_stand,
  total_aboveground_carbon = average_per_stand,
  total_fuel_exposed_to_fire = average_per_stand,
  unemployment_percentile = average_per_stand,
  wetland_diversity = average_and_clamp,
  wildlife_species_richness = average_per_stand,
  wildland_urban_interface = average_and_clamp,
  wui_damage_potential = average_and_clamp
)

METRIC_COLUMNS <- list(
  distance_to_roads = "min",
  slope = "max",
  low_income_population_proportional = "sum",
  wui = "majority",
  mean_percent_fire_return_interval_departure_condition_class = "majority",
  f3veg100 = "majority",
  wildland_urban_interface = "majority"
)


get_sdw <- function() {
  return(as.numeric(Sys.getenv("FORSYS_SDW", "0.5")))
}

get_epw <- function() {
  return(as.numeric(Sys.getenv("FORSYS_EPW", "0.5")))
}

get_exclusion_limit <- function() {
  return(as.numeric(Sys.getenv("FORSYS_EXCLUSION_LIMIT", "0.5")))
}

get_sample_frac <- function() {
  return(as.numeric(Sys.getenv("FORSYS_SAMPLE_FRAC", "0.1")))
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

get_output_dir <- function(scenario) {
  return(paste0(getwd(), "/output/", scenario$uuid))
}

get_scenario_data <- function(connection, scenario_id) {
  query <- "SELECT
              s.id,
              s.user_id as \"created_by_id\",
              s.name,
              s.uuid,
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
  return(tibble(head(result, 1)))
}

get_restrictions <- function(connection, scenario_id, restrictions) {
  statement <- "
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
      ST_Transform(ST_Union(ST_Buffer(rr.geometry, 0)), 5070) as \"geometry\"
    FROM restrictions_restriction rr, plan_scenario
    WHERE
      type IN ({restrictions*}) AND
      rr.geometry && plan_scenario.geometry AND
      ST_Intersects(rr.geometry, plan_scenario.geometry)"
  restrictions_statement <- glue_sql(statement, scenario_id = scenario_id, restrictions = restrictions, .con = connection)
  crs <- st_crs(5070)
  restriction_data <- st_read(
    dsn = connection,
    layer = NULL,
    query = restrictions_statement,
    geometry_column = "geometry",
    crs = crs
  )
  log_info("restriction data using {crs}")
  return(restriction_data)
}

get_stands <- function(connection, scenario_id, stand_size, restrictions) {
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
      ss.\"size\" = {stand_size} AND
      ss.geometry && plan_scenario.geometry AND
      ST_Within(ST_Centroid(ss.geometry), plan_scenario.geometry)"
  query <- glue_sql(query_text, scenario_id = scenario_id, .con = connection)
  crs <- st_crs(5070)
  stands <- st_read(
    dsn = connection,
    layer = NULL,
    query = query,
    geometry_column = "geometry",
    crs = crs
  )

  log_info("stand data using {crs}")

  if (length(restrictions) > 0) {
    log_info("Restrictions found!")
    restriction_data <- get_restrictions(connection, scenario_id, restrictions)
    stands <- st_filter(stands, restriction_data, .predicate = st_disjoint)
  }
  return(stands)
}

preprocess_metrics <- function(metrics, condition_name) {
  if (condition_name %in% names(PREPROCESSING_MULTIPLIERS)) {
    multiplier <- PREPROCESSING_MULTIPLIERS[[condition_name]]
    expr <- glue("{condition_name} * {multiplier}")
    log_info(
      paste(
        condition_name,
        "is being preprocessed with expr",
        expr
      )
    )
    metrics <- metrics %>%
      mutate(
        !!treat_string_as_col(condition_name) := !!treat_string_as_expr(expr)
      )
  }
  return(metrics)
}

get_metric_column <- function(condition_name) {
  if (exists(condition_name, METRIC_COLUMNS)) {
    return(METRIC_COLUMNS[[condition_name]])
  }
  return("avg")
}

get_stand_metrics <- function(
      connection,
      condition_id,
      condition_name,
      stand_ids) {
    if (is_enabled(stand_metrics_with_datalayer)) {
        return(get_stand_metrics_new(connection, condition_name, stand_ids))
    }
    return(get_stand_metrics_legacy(connection, condition_id, condition_name, stand_ids))
}

get_stand_metrics_legacy <- function(
    connection,
    condition_id,
    condition_name,
    stand_ids) {
  metric_column <- get_metric_column(condition_name)
  query <- glue_sql(
    "SELECT
      stand_id,
      COALESCE({`metric_column`}, 0) AS {`condition_name`}
     FROM stands_standmetric
     WHERE
       condition_id = {condition_id} AND
       stand_id IN ({stand_ids*})",
    condition_id = condition_id,
    condition_name = condition_name,
    stand_ids = stand_ids,
    .con = connection
  )
  result <- dbGetQuery(connection, query) %>% preprocess_metrics(condition_name)
  return(result)
}

get_stand_metrics_new <- function(
    connection,
    datalyer_name,
    stands_ids) {
    query <- glue_sql(
    "SELECT
      stand_id,
      COALESCE(avg, 0) AS {`datalyer_name`}
     FROM stands_standmetric sm
     INNER JOIN datasets_datalayer dl
      ON dl.id = sm.datalayer_id
     WHERE
       dl.metadata @> '{\"modules\": {\"forsys\": {\"legacy_name\": `datalayer_name`}}}'::jsonb 
       AND stand_id IN ({stand_ids*})",
    datalyer_name = datalyer_name,
    stand_ids = stand_ids,
    .con = connection
  )
  result <- dbGetQuery(connection, query) %>% preprocess_metrics(condition_name)
  return(result)
}

get_project_geometry <- function(connection, stand_ids) {
  query <- glue_sql("SELECT
            ST_AsGeoJSON(
              ST_Union(geometry)
            )
            FROM stands_stand
            WHERE id IN ({stand_ids*})",
    stand_ids = stand_ids,
    .con = connection
  )
  result <- dbGetQuery(connection, query)
  return(fromJSON(result$st_asgeojson))
}

get_project_geometry_text <- function(connection, stand_ids) {
  query <- glue_sql("SELECT
            ST_AsText(
              ST_Union(geometry)
            ) as \"geometry\"
            FROM stands_stand
            WHERE id IN ({stand_ids*})",
    stand_ids = stand_ids,
    .con = connection
  )
  result <- dbGetQuery(connection, query)
  return(result$geometry)
}

get_project_ids <- function(forsys_output) {
  return(unique(forsys_output$project_output$proj_id))
}

rename_col <- function(name) {
  new_name <- gsub(
    "^(ETrt_)",
    "",
    name
  )
  return(new_name)
}

get_cost_per_acre <- function(scenario) {
  configuration <- get_configuration(scenario)
  user_defined_cost <- configuration[["est_cost"]]
  if (is.null(user_defined_cost)) {
    return(DEFAULT_COST_PER_ACRE)
  } else {
    return(user_defined_cost)
  }
}


to_properties <- function(
    project_id,
    scenario,
    forsys_project_outputs,
    project_stand_count,
    stand_size,
    text_geometry,
    new_column_for_postprocessing = FALSE) {
  scenario_cost_per_acre <- get_cost_per_acre(scenario)
  project_data <- forsys_project_outputs %>%
    filter(proj_id == project_id) %>%
    select(-contains("Pr_1")) %>%
    mutate(stand_count = project_stand_count) %>%
    mutate(total_cost = ETrt_area_acres * scenario_cost_per_acre) %>%
    mutate(cost_per_acre = scenario_cost_per_acre) %>%
    mutate(pct_area = ETrt_area_acres / scenario$planning_area_acres) %>%
    mutate(text_geometry = text_geometry) %>%
    rename_with(.fn = rename_col)

  # post process
  log_info("Postprocessing results.")
  for (column in names(project_data)) {
    if (column %in% names(POSTPROCESSING_FUNCTIONS)) {
      postprocess_fn <- POSTPROCESSING_FUNCTIONS[[column]]
      if (new_column_for_postprocessing) {
        new_column <- glue("p_{column}")
      } else {
        new_column <- column
      }
      log_info("Post processing {column} to {new_column}.")
      project_data <- project_data %>%
        mutate(
          !!treat_string_as_col(new_column) := postprocess_fn(!!treat_string_as_col(column), project_stand_count, stand_size, column)
        )
    }
  }

  return(as.list(project_data))
}

to_project_data <- function(
    connection,
    scenario,
    project_id,
    forsys_outputs,
    new_column_for_postprocessing = FALSE) {
  configuration <- get_configuration(scenario)
  stand_size <- get_stand_size(configuration)
  project_stand_ids <- select(
    filter(
      forsys_outputs$stand_output,
      proj_id == project_id,
      DoTreat == 1
    ),
    stand_id
  )
  stand_count <- nrow(project_stand_ids)
  project_stand_ids <- as.integer(project_stand_ids$stand_id)
  geometry <- get_project_geometry(connection, project_stand_ids)
  text_geometry <- get_project_geometry_text(connection, project_stand_ids)
  properties <- to_properties(
    project_id,
    scenario,
    forsys_outputs$project_output,
    stand_count,
    stand_size,
    text_geometry,
    new_column_for_postprocessing
  )
  return(list(
    type = "Feature",
    properties = properties,
    geometry = geometry
  ))
}

to_projects <- function(con, scenario, forsys_outputs, new_column_for_postprocessing = FALSE) {
  project_ids <- get_project_ids(forsys_outputs)
  projects <- list()
  projects <- lapply(project_ids, function(project_id) {
    return(to_project_data(
      con,
      scenario,
      project_id,
      forsys_outputs,
      new_column_for_postprocessing
    ))
  })
  geojson <- list(type = "FeatureCollection", features = projects)
  return(geojson)
}

merge_data <- function(stands, metrics) {
  data <- left_join(x = stands, y = metrics, by = "stand_id")

  return(data)
}

now_utc <- function() {
  strftime(as.POSIXlt(Sys.time(), "UTC"), "%Y-%m-%dT%H:%M:%S")
}

get_priorities <- function(
    connection,
    scenario,
    conditions) {
  priorities <- list()

  priorities <- lapply(conditions, function(priority) {
    priority <- priority_to_condition(connection, scenario, priority)
    return(priority)
  })
  return(data.table::rbindlist(priorities))
}

get_stand_data <- function(connection, scenario, configuration, conditions) {
  stand_size <- get_stand_size(configuration)

  stands <- get_stands(connection, scenario$id, stand_size, as.vector(configuration$excluded_areas))
  for (row in seq_len(nrow(conditions))) {
    condition_id <- conditions[row, "condition_id"]$condition_id
    condition_name <- conditions[row, "condition_name"]$condition_name
    metric <- get_stand_metrics(
      connection,
      condition_id,
      condition_name,
      stands$stand_id
    )

    if (nrow(metric) <= 0) {
      log_warn(
        paste(
          "Condition",
          condition_name,
          "with id",
          condition_id,
          "yielded an empty result. check underlying data!"
        )
      )

      if (any(is.na(metric[, condition_name]))) {
        log_warn(
          paste(
            "Condition",
            condition_name,
            "contains NA/NULL values."
          )
        )
      }

      metric <- data.frame(stand_id = stands$stand_id, rep(0, nrow(stands)))
      names(metric) <- c("stand_id", condition_name)
    }
    stands <- merge_data(stands, metric)
  }
  stands <- stands %>% mutate(across(where(is.numeric), ~ replace_na(.x, 0)))
  return(stands)
}

get_configuration <- function(scenario) {
  configuration <- fromJSON(toString(scenario[["configuration"]]))
  return(configuration)
}

get_stand_size <- function(configuration) {
  stand_size <- configuration$stand_size
  if (is.null(stand_size)) {
    return("LARGE")
  }

  return(stand_size)
}

get_weights <- function(priorities, configuration) {
  condition_count <- length(priorities$condition_name)
  weight_count <- length(configuration$weights)

  if (weight_count == 0) {
    log_info("generating weights")
    return(rep(1, length(priorities$condition_name)))
  }

  if (weight_count < condition_count) {
    log_info("padding weights")
    return(
      c(configuration$weights, rep(1, condition_count - weight_count))
    )
  }

  if (weight_count > condition_count) {
    log_info("trimming weights")
    return(configuration$weights[1:condition_count])
  }

  log_info("using configured weights")
  return(configuration$weights)
}

get_number_of_projects <- function(scenario) {
  # this is hardcoded for now. in the future it
  # might come from the configuration JSON
  return(10)
}

get_min_project_area <- function(scenario) {
  configuration <- get_configuration(scenario)
  stand_size <- configuration$stand_size
  min_area <- 500

  if (stand_size == "MEDIUM") {
    min_area <- 100
  }

  if (stand_size == "SMALL") {
    min_area <- 10
  }

  log_info(
    paste(
      "Stand size",
      stand_size,
      "chosen. Minimum project area is",
      min_area
    )
  )
  return(min_area)
}

get_max_treatment_area <- function(scenario) {
  configuration <- get_configuration(scenario)
  budget <- configuration$max_budget
  cost_per_acre <- get_cost_per_acre(scenario)

  if (!is.null(budget) && cost_per_acre != 0) {
    max_acres <- budget / cost_per_acre
    log_info(
      paste(
        "Budget is configured for",
        budget,
        ".Total acres:",
        max_acres
      )
    )
    return(max_acres)
  }

  if (!is.null(configuration$max_treatment_area_ratio)) {
    log_info("Budget is null, using max acres with area {configuration$max_treatment_area_ratio}")
    return(configuration$max_treatment_area_ratio)
  }

  max_acres <- get_min_project_area(configuration$stand_size) * get_number_of_projects(scenario)
  log_warn("There is no information to properly calculate max area, using {max_acres}.")
  return(max_acres)
}

get_distance_to_roads <- function(configuration) {
  # converts specified distance to roads in yards to meters
  distance_in_meters <- configuration$min_distance_from_road / 1.094
  return(glue("distance_to_roads <= {distance_in_meters}"))
}

get_max_slope <- function(configuration) {
  max_slope <- configuration$max_slope
  return(glue("slope <= {max_slope}"))
}

get_stand_thresholds <- function(scenario) {
  all_thresholds <- c()
  configuration <- get_configuration(scenario)

  if (!is.null(configuration$max_slope)) {
    max_slope <- get_max_slope(configuration)
    all_thresholds <- c(all_thresholds, max_slope)
  }

  if (!is.null(configuration$min_distance_from_road)) {
    distance_to_roads <- get_distance_to_roads(configuration)
    all_thresholds <- c(all_thresholds, distance_to_roads)
  }

  if (length(configuration$stand_thresholds) > 0) {
    all_thresholds <- c(all_thresholds, configuration$stand_thresholds)
  }

  if (length(all_thresholds) > 0) {
    return(paste(all_thresholds, collapse = " & "))
  }
  return(NULL)
}

remove_duplicates <- function(dataframe) {
  return(dataframe[!duplicated(dataframe), ])
}

export_input <- function(scenario, stand_data) {
  output_dir <- get_output_dir(scenario)
  if (!dir.exists(output_dir)) {
    dir.create(output_dir)
  }
  output_file <- paste0(output_dir, "/inputs.csv")
  if (!file.exists(output_file)) {
    file.create(output_file)
  }
  layer_options <- c("GEOMETRY=AS_WKT")
  st_write(stand_data, output_file, layer_options = layer_options, append = FALSE, delete_dsn = TRUE)
}

call_forsys <- function(
    connection,
    scenario,
    configuration,
    priorities,
    outputs,
    restrictions) {
  forsys_inputs <- data.table::rbindlist(
    list(priorities, outputs, restrictions)
  )
  # we use this to drop priorities, that are repeated in here - we need those
  # so front-end can show data from priorities as well
  forsys_inputs <- remove_duplicates(forsys_inputs)

  stand_data <- get_stand_data(
    connection,
    scenario,
    configuration,
    forsys_inputs
  )

  if (length(priorities$condition_name) > 1) {
    weights <- get_weights(priorities, configuration)
    log_info("combining priorities")
    stand_data <- stand_data %>%
      forsys::calculate_spm(fields = priorities$condition_name) %>%
      forsys::calculate_pcp(fields = priorities$condition_name) %>%
      forsys::combine_priorities(
        fields = paste0(priorities$condition_name, "_SPM"),
        weights = weights,
        new_field = "priority"
      )
    scenario_priorities <- c("priority")
  } else {
    log_info("running with single priority")
    scenario_priorities <- first(priorities$condition_name)
  }
  # this might be configurable in the future. if it's the case, it will come in
  # the configuration variable. This also might change due the course of the
  # project as we're not sure on how many projects we will have at the beginning
  max_treatment_area <- get_max_treatment_area(scenario)
  number_of_projects <- get_number_of_projects(scenario)
  min_area_project <- get_min_project_area(scenario)
  max_area_project <- max_treatment_area / number_of_projects

  stand_thresholds <- get_stand_thresholds(scenario)

  log_info(paste("Thresholds configured:", stand_thresholds))

  export_input(scenario, stand_data)

  sdw <- get_sdw()
  epw <- get_epw()
  sample_frac <- get_sample_frac()
  exclusion_limit <- get_exclusion_limit()

  out <- forsys::run(
    return_outputs = TRUE,
    write_outputs = TRUE,
    overwrite_output = FALSE,
    scenario_name = scenario$uuid, # using UUID here instead of name
    scenario_output_fields = c(outputs$condition_name, "area_acres"),
    scenario_priorities = scenario_priorities,
    stand_data = stand_data,
    stand_area_field = "area_acres",
    stand_id_field = "stand_id",
    stand_threshold = stand_thresholds,
    run_with_patchmax = TRUE,
    patchmax_proj_size_min = min_area_project,
    patchmax_proj_size = max_area_project,
    patchmax_proj_number = number_of_projects,
    patchmax_SDW = sdw,
    patchmax_EPW = epw,
    patchmax_exclusion_limit = exclusion_limit,
    patchmax_sample_frac = sample_frac,
    patchmax_sample_seed = configuration$seed,
  )
  return(out)
}

delete_project_areas <- function(
  connection,
  scenario) {
  query <- glue_sql(
    "DELETE FROM planning_projectarea WHERE scenario_id = {scenario_id}",
    scenario_id=scenario$id,
    .con=connection
  )
  dbExecute(connection, query, immediate = TRUE)
}

upsert_project_area <- function(
  connection,
  timestamp,
  scenario,
  project) {
  area_name = glue("Project Area {area_number}", area_number=project$properties$proj_id)
  query <- glue_sql("INSERT INTO planning_projectarea (
      uuid,
      created_at,
      updated_at,
      created_by_id,
      scenario_id,
      name,
      data,
      geometry
    ) VALUES (
      {uuid},
      {created_at},
      {updated_at},
      {created_by_id},
      {scenario_id},
      {name},
      {data},
      ST_Multi(
        ST_SetSRID(ST_GeomFromText({geometry}), 4269)
      )
    )
    ON CONFLICT (scenario_id, name) DO UPDATE
    SET
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at,
      created_by_id = EXCLUDED.created_by_id,
      data = EXCLUDED.data,
      geometry = EXCLUDED.geometry;
    ", 
      created_at = timestamp, 
      updated_at = timestamp,
      uuid = UUIDgenerate(),
      created_by_id=scenario$created_by_id,
      scenario_id=scenario$id,
      name=area_name,
      data=toJSON(project$properties),
      geometry=project$properties$text_geometry,
      .con = connection
    )
    dbExecute(connection, query, immediate = TRUE)
}

upsert_scenario_result <- function(
    connection,
    timestamp,
    started_at,
    completed_at,
    scenario_id,
    status,
    geojson_result) {
  query <- glue_sql("INSERT into planning_scenarioresult (
    created_at,
    updated_at,
    started_at,
    completed_at,
    scenario_id,
    status,
    result
  ) VALUES (
    {created_at},
    {updated_at},
    {started_at},
    {completed_at},
    {scenario_id},
    {status},
    {geojson_result}::jsonb
  )
  ON CONFLICT (scenario_id) DO UPDATE
  SET
    updated_at = EXCLUDED.updated_at,
    started_at = EXCLUDED.started_at,
    completed_at = EXCLUDED.completed_at,
    result = EXCLUDED.result,
    status = EXCLUDED.status;
  ",
    created_at = timestamp,
    updated_at = timestamp,
    started_at = started_at,
    completed_at = completed_at,
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
  if (!is.null(configuration$seed)) {
    log_info(glue("Using user-provided RNG seed: {configuration$seed}"))
    set.seed(configuration$seed)
  }
  priorities <- get_priorities(
    connection,
    scenario,
    configuration$scenario_priorities
  )

  outputs <- get_priorities(
    connection,
    scenario,
    configuration$scenario_output_fields
  )

  restrictions <- get_priorities(
    connection,
    scenario,
    c("slope", "distance_to_roads")
  )
  new_column_for_postprocessing <- Sys.getenv(
    "NEW_COLUMN_FOR_POSTPROCESSING",
    FALSE
  )
  tryCatch(
    expr = {
      forsys_output <- call_forsys(
        connection,
        scenario,
        configuration,
        priorities,
        outputs,
        restrictions
      )
      completed_at <- now_utc()
      result <- to_projects(
        connection,
        scenario,
        forsys_output,
        new_column_for_postprocessing = new_column_for_postprocessing
      )
      upsert_scenario_result(
        connection,
        now,
        started_at = now,
        completed_at = completed_at,
        scenario_id,
        "SUCCESS",
        result
      )
      delete_project_areas(connection, scenario)
      project_areas <- lapply(result$features, function(project)  {
        return(upsert_project_area(connection, now, scenario, project))
      })
      
      log_info(paste("[OK] Forsys succeeeded for scenario", scenario_id))
    },
    error = function(e) {
      log_error(paste("[FAIL] Forsys failed.", e))
      completed_at <- now_utc()
      upsert_scenario_result(
        connection,
        now,
        started_at = now,
        completed_at = completed_at,
        scenario_id,
        "FAILURE",
        list(type = "FeatureCollection", features = list())
      )
      
    },
    finally = {
      log_info(paste("[DONE] Forsys execution finished."))
    }
  )
}

main(scenario_id)
