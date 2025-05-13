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

import::from(queries.R, .all=TRUE)
import::from(constants.R, .all=TRUE)

FORSYS_V2 <- as.logical(Sys.getenv("FORSYS_V2", "False"))

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

get_restriction_v2 <- function(connection, scenario_id, datalayer_table_name) {
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
    FROM {datalayer_table_name} rr, plan_scenario
    WHERE
      rr.geometry && plan_scenario.geometry AND
      ST_Intersects(rr.geometry, plan_scenario.geometry)"
  restrictions_statement <- glue_sql(statement, scenario_id = scenario_id, datalayer_table_name = datalayer_table_name, .con = connection)
  crs <- st_crs(5070)
  restriction_data <- st_read(
    dsn = connection,
    layer = NULL,
    query = restrictions_statement,
    geometry_column = "geometry",
    crs = crs
  )
  return(restriction_data)
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
    if (FORSYS_V2) {
      for(datalayer_id in seq_along(restrictions)) {
        restriction <- get_datalayer_by_id(datalayer_id)
        restriction_data <- get_restriction_v2(connection, scenario_id, restriction)
        stands <- st_filter(stands, restriction_data, .predicate = st_disjoint)
      }
    } else {
      restriction_data <- get_restrictions(connection, scenario_id, restrictions)
      stands <- st_filter(stands, restriction_data, .predicate = st_disjoint)
    }
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
  if (FORSYS_V2) {
    cost_field <- "estimated_cost"
  } else {
    cost_field <- "est_cost"
  }
  configuration <- get_configuration(scenario)
  user_defined_cost <- configuration[[cost_field]]
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

get_priorities_v2 <- function(connection, scenario) {

  priorities <- list()

  priorities <- lapply()

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

get_stand_data_v2 <- function(connection, scenario, configuration, datalayers) {
  stand_size <- get_stand_size(configuration)
  stands <- get_stands(connection, scenario$id, stand_size, as.vector(configuration$excluded_areas))
  for (row in seq_len(nrow(datalayers))) {
    datalayer_id <- datalayers[row, "id"]$id
    datalayer_name <- datalayers[row, "name"]$name
    
    metric <- get_stand_metrics_v2(
      connection,
      datalayer_id,
      datalayer_name,
      stands$stand_id
    )

    if (nrow(metric) <= 0) {
      log_warn(
        paste(
          "DATALAYER",
          datalayer_name,
          "with id",
          datalayer_id,
          "yielded an empty result. check underlying data!"
        )
      )

      if (any(is.na(metric[, datalayer_name]))) {
        log_warn(
          paste(
            "DATALAYER",
            datalayer_name,
            "contains NA/NULL values."
          )
        )
      }

      metric <- data.frame(stand_id = stands$stand_id, rep(0, nrow(stands)))
      names(metric) <- c("stand_id", datalayer_name)
    }
    stands <- merge_data(stands, metric)
  }
  stands <- stands %>% mutate(across(where(is.numeric), ~ replace_na(.x, 0)))
  return(stands)
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
  # no v2 changes
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
  if (FORSYS_V2) {
    configuration <- get_configuration(scenario)
    return(configuration$max_project_count)
  }
  return(10)
}

get_min_project_area <- function(scenario) {
  # no v2 changes
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
  # no v2 changes
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
  if (FORSYS_V2) {
    max_area_field <- "max_area"
  } else {
    max_area_field <- "max_treatment_area_ration"
  }

  if (!is.null(configuration[max_area_field])) {
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
get_stand_thresholds_v2 <- function(scenario, datalayers) {
  
  all_thresholds <- c()
  configuration <- get_configuration(scenario)

  # no changes for v2
  if (!is.null(configuration$max_slope)) {
    max_slope <- get_max_slope(configuration)
    all_thresholds <- c(all_thresholds, max_slope)
  }

  # no changes for v2
  if (!is.null(configuration$min_distance_from_road)) {
    distance_to_roads <- get_distance_to_roads(configuration)
    all_thresholds <- c(all_thresholds, distance_to_roads)
  }
  
  text_thresholds = datalayers["threshold"] %>% drop_na()
  if (length(text_thresholds) > 0) {
    all_thresholds <- c(all_thresholds, text_thresholds)
  }

  if (length(all_thresholds) > 0) {
    return(paste(all_thresholds, collapse = " & "))
  }
  return(NULL)
}
get_stand_thresholds <- function(scenario) {
  all_thresholds <- c()
  configuration <- get_configuration(scenario)

  # no changes for v2
  if (!is.null(configuration$max_slope)) {
    max_slope <- get_max_slope(configuration)
    all_thresholds <- c(all_thresholds, max_slope)
  }

  # no changes for v2
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

  if (FORSYS_V2) {
    stand_data <- get_stand_data_v2(
      connection,
      scenario,
      configuration,
      forsys_inputs
    )

  } else {
    stand_data <- get_stand_data(
      connection,
      scenario,
      configuration,
      forsys_inputs
    )
  }

  if (FORSYS_V2) {
    if (length(priorities$name) > 1) {
      weights <- get_weights(priorities, configuration)
      log_info("combining priorities")
      stand_data <- stand_data %>%
        forsys::calculate_spm(fields = priorities$name) %>%
        forsys::calculate_pcp(fields = priorities$name) %>%
        forsys::combine_priorities(
          fields = paste0(priorities$name, "_SPM"),
          weights = weights,
          new_field = "priority"
        )
      scenario_priorities <- c("priority")
    } else {
      log_info("running with single priority")
      scenario_priorities <- first(priorities$name)
    }

  } else {

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

  }

  # this might be configurable in the future. if it's the case, it will come in
  # the configuration variable. This also might change due the course of the
  # project as we're not sure on how many projects we will have at the beginning
  max_treatment_area <- get_max_treatment_area(scenario)
  number_of_projects <- get_number_of_projects(scenario)
  min_area_project <- get_min_project_area(scenario)
  max_area_project <- max_treatment_area / number_of_projects

  if (FORSYS_V2) {
    stand_thresholds <- get_stand_thresholds_v2(scenario, restrictions)
  } else {
    stand_thresholds <- get_stand_thresholds(scenario)
  }

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
  deletions = dbExecute(connection, query, immediate = TRUE)
  log_info(glue("Deleted {deletions} project areas for scenario {scenario$id}"))
  return(deletions)
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

main_v2 <- function(scenario_id) {
  now <- now_utc()
  connection <- get_connection()
  scenario <- get_scenario_by_id(connection, scenario_id)
  configuration <- get_configuration(scenario)
  if (!is.null(configuration$seed)) {
    log_info(glue("Using user-provided RNG seed: {configuration$seed}"))
    set.seed(configuration$seed)
  }
  treatment_goal <- get_treatment_goal_by_scenario_id(connection, scenario$id)
  datalayers <- get_treatment_goal_datalayers(connection, treatment_goal$id)
  priorities <- filter(datalayers, type == "RASTER", usage_type == "PRIORITY")
  secondary_metrics <- filter(datalayers, type == "RASTER", usage_type == "SECONDARY_METRIC")
  thresholds <- filter(datalayers, type == "RASTER", usage_type == "THRESHOLD")
  exclusion_zones <- filter(datalayers, usage_type == "EXCLUSION_ZONE" & geometry_type == "POLYGON" | geometry_type == "MULTIPOLYGON")
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
        secondary_metrics,
        thresholds
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
      stop(e)
    },
    finally = {
      log_info(paste("[DONE] Forsys execution finished."))
    }
  )
}

main <- function(scenario_id) {
  now <- now_utc()
  connection <- get_connection()
  scenario <- get_scenario_by_id(connection, scenario_id)
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
      stop(e)
    },
    finally = {
      log_info(paste("[DONE] Forsys execution finished."))
    }
  )
}
