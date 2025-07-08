FORSYS_V2 <- as.logical(Sys.getenv("USE_SCENARIO_V2", "False"))

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
  output_dir <- Sys.getenv("FORSYS_OUTPUT_DIR", "")
  if (output_dir == "") {
    output_dir <- paste0(getwd(), "/output/")
  }
  return(paste0(output_dir, scenario$uuid))
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
  schema_table <- strsplit(datalayer_table_name, split = ".", fixed = TRUE)
  schema <- schema_table[[1]][1]
  table <- schema_table[[1]][2]
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
    FROM {`schema`}.{`table`} rr, plan_scenario
    WHERE
      rr.geometry && plan_scenario.geometry AND
      ST_Intersects(rr.geometry, plan_scenario.geometry)"
  restrictions_statement <- glue_sql(
    statement,
    scenario_id = scenario_id,
    schema = schema,
    table = table,
    .con = connection
  )
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

  if (length(restrictions) > 0) {
    print("Restrictions found!")
    if (FORSYS_V2) {
      for (i in seq_along(restrictions)) {
        datalayer_id <- restrictions[i]
        restriction <- get_datalayer_by_id(connection, datalayer_id)
        if (!(restriction$geometry_type %in% ALLOWED_RESTRICTION_TYPES)) {
          print(
            glue(
              "Restriction",
              restriction$id,
              "with name",
              restriction$name,
              "cannot be used because its not a polygon."
            )
          )
          next
        }
        restriction_data <- get_restriction_v2(connection, scenario_id, restriction$table)
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
    print(
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

get_metric_column <- function(name) {
  if (is.null(name)) {
    return("avg")
  }

  if (exists(name, METRIC_COLUMNS)) {
    return(METRIC_COLUMNS[[name]])
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
  new_name
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
  attainment <- forsys_project_outputs %>% filter(proj_id == project_id) %>% select(contains("attain_"))
  project_data <- forsys_project_outputs %>%
    filter(proj_id == project_id) %>%
    select(-contains("Pr_1")) %>%
    select(-contains("attain_")) %>%
    mutate(stand_count = project_stand_count) %>%
    mutate(total_cost = ETrt_area_acres * scenario_cost_per_acre) %>%
    mutate(cost_per_acre = scenario_cost_per_acre) %>%
    mutate(pct_area = ETrt_area_acres / scenario$planning_area_acres) %>%
    mutate(attainment = attainment) %>%
    rename_with(.fn = rename_col)
  # post process
  print("Postprocessing results.")
  if (FORSYS_V2) {
    print("No postprocessing for v2")
  } else {
    for (column in names(project_data)) {
      if (column %in% names(POSTPROCESSING_FUNCTIONS)) {
        postprocess_fn <- POSTPROCESSING_FUNCTIONS[[column]]
        if (new_column_for_postprocessing) {
          new_column <- glue("p_{column}")
        } else {
          new_column <- column
        }
        print("Post processing {column} to {new_column}.")
        project_data <- project_data %>%
          mutate(
            !!treat_string_as_col(new_column) := postprocess_fn(!!treat_string_as_col(column), project_stand_count, stand_size, column)
          )
      }
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

get_metric_data <- function(connection, stands, datalayer) {
  datalayer_id <- datalayer$id
  datalayer_name <- datalayer$name
  field_name <- paste0("datalayer_", datalayer_id)

  metric <- get_stand_metrics_v2(
    connection,
    datalayer,
    stands$stand_id
  ) %>% mutate(across(where(is.numeric), ~ replace_na(.x, 0)))
  metric[[field_name]][metric[[field_name]] == -Inf] <- 0

  if (nrow(metric) <= 0) {
    print(paste("DATALAYER", datalayer_name, "with id", datalayer_id, "yielded empty. check data."))

    if (any(is.na(metric[, field_name]))) {
      print(paste("DATALAYER", datalayer_name, "contains NA/NULL values."))
    }

    metric <- data.frame(stand_id = stands$stand_id, rep(0, nrow(stands)))
    # handle cases where we don´t  have data and it's all zeros.
    names(metric) <- c("stand_id", field_name)
  }

  metric
}

get_stand_data_v2 <- function(connection, scenario, configuration, datalayers) {
  stand_size <- get_stand_size(configuration)
  stands <- get_stands(connection, scenario$id, stand_size, as.vector(configuration$excluded_areas_ids))
  if (!is.null(configuration$max_slope)) {
    datalayer <- get_datalayer_by_forsys_name(connection, "slope")
    metric <- get_metric_data(connection, stands, datalayer)
    stands <- merge_data(stands, metric)
  }
  if (!is.null(configuration$min_distance_from_road)) {
    datalayer <- get_datalayer_by_forsys_name(connection, "distance_from_roads")
    metric <- get_metric_data(connection, stands, datalayer)
    stands <- merge_data(stands, metric)
  }
  for (row in seq_len(nrow(datalayers))) {
    datalayer <- datalayers[row, ]
    metric <- get_metric_data(connection, stands, datalayer)
    stands <- merge_data(stands, metric)
  }
  stands
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
      print(
        paste(
          "Condition",
          condition_name,
          "with id",
          condition_id,
          "yielded an empty result. check underlying data!"
        )
      )

      if (any(is.na(metric[, condition_name]))) {
        print(
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
  weight_count <- length(configuration$weights)

  if (FORSYS_V2) {
    target_count <- nrow(remove_duplicates_v2(priorities))
  } else {
    target_count <- length(priorities$condition_name)
  }

  if (weight_count == 0) {
    print("generating weights")
    return(rep(1, target_count))
  }

  if (weight_count < target_count) {
    print("padding weights")
    return(
      c(configuration$weights, rep(1, target_count - weight_count))
    )
  }

  if (weight_count > target_count) {
    print("trimming weights")
    return(configuration$weights[1:target_count])
  }
  # just return configured weights
  configuration$weights
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

  print(
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
    return(max_acres)
  }
  if (FORSYS_V2) {
    max_area_field <- "max_area"
  } else {
    max_area_field <- "max_treatment_area_ratio"
  }

  if (!is.null(configuration[[max_area_field]])) {
    print("Budget is null, using max acres with area {configuration$max_treatment_area_ratio}")
    return(configuration[[max_area_field]])
  }

  max_acres <- get_min_project_area(scenario) * get_number_of_projects(scenario)
  print("There is no information to properly calculate max area, using {max_acres}.")
  return(max_acres)
}

get_distance_to_roads <- function(configuration, datalayer) {
  # converts specified distance to roads in yards to meters
  distance_in_meters <- configuration$min_distance_from_road / 1.094
  if (FORSYS_V2) {
    glue("datalayer_{datalayer$id} <= {distance_in_meters}")
  } else {
    glue("distance_to_roads <= {distance_in_meters}")
  }
}

get_max_slope <- function(configuration, datalayer) {
  max_slope <- configuration$max_slope
  if (FORSYS_V2) {
    glue("datalayer_{datalayer$id} <= {max_slope}")
  } else {
    glue("slope <= {max_slope}")
  }
}

get_stand_thresholds_v2 <- function(connection, scenario, datalayers) {
  all_thresholds <- c()
  configuration <- get_configuration(scenario)

  # no changes for v2
  if (!is.null(configuration$max_slope)) {
    slope_layer <- get_datalayer_by_forsys_name(connection, "slope")
    max_slope <- get_max_slope(configuration, slope_layer)
    all_thresholds <- c(all_thresholds, max_slope)
  }

  # no changes for v2
  if (!is.null(configuration$min_distance_from_road)) {
    distance_from_roads_layer <- get_datalayer_by_forsys_name(connection, "distance_from_roads")
    distance_to_roads <- get_distance_to_roads(configuration, distance_from_roads_layer)
    all_thresholds <- c(all_thresholds, distance_to_roads)
  }

  for (i in seq_len(nrow(datalayers))) {
    datalayer <- datalayers[i, ]
    if (is.null(datalayer$threshold)) {
      next
    }
    curr_threshold <- gsub("value", paste0("datalayer_", datalayer$id), datalayer$threshold)
    all_thresholds <- c(all_thresholds, curr_threshold)
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

remove_duplicates_v2 <- function(dataframe) {
  return(dataframe %>% distinct(id, .keep_all = TRUE))
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
  data_inputs <- data.table::rbindlist(list(priorities, outputs))
  # we use this to drop priorities, that are repeated in here - we need those
  # so front-end can show data from priorities as well
  if (FORSYS_V2) {
    forsys_inputs <- remove_duplicates_v2(forsys_inputs)
  } else {
    forsys_inputs <- remove_duplicates(forsys_inputs)
  }
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
    # new code will calculate spm and pcp for all inputs, excludind thresholds
    # this is needed because we have layers that can be inputs, but are not part
    # of solving our equations - such as slope and distance from roads
    weights <- get_weights(priorities, configuration)
    fields <- paste0("datalayer_", priorities[["id"]])
    spm_fields <- paste0(fields, "_SPM")
    stand_data <- stand_data %>%
      forsys::calculate_spm(fields=fields) %>% 
      forsys::calculate_pcp(fields=fields) %>% 
      forsys::combine_priorities(
        fields=spm_fields,
        weights=weights,
        new_field="priority"
      )
      scenario_priorities <- c("priority")
  } else {
    if (length(priorities$condition_name) > 1) {
      weights <- get_weights(priorities, configuration)
      print("combining priorities")
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
      print("running with single priority")
      scenario_priorities <- first(priorities$condition_name)
    }
  }

  # this might be configurable in the future. if it's the case, it will come in
  # the configuration variable. This also might change due the course of the
  # project as we're not sure on how many projects we will have at the beginning
  max_treatment_area <- get_max_treatment_area(scenario)
  number_of_projects <- get_number_of_projects(scenario)
  min_area_project <- get_min_project_area(scenario)

  # this scenario here happens when we don't have enough budget/area
  # for all the 10 projects. so we recalculate how many projects fits
  # in this planning area, based on the min_area_project (this is the stand size)
  if ((max_treatment_area / number_of_projects) < min_area_project) {
    number_of_projects <- floor(max_treatment_area / min_area_project)
  }
  
  max_area_project <- max_treatment_area / number_of_projects
  
  if (FORSYS_V2) {
    stand_thresholds <- get_stand_thresholds_v2(connection, scenario, restrictions)
    output_tmp <- forsys_inputs %>%
      remove_duplicates_v2() %>%
      select(id)
    output_tmp <- paste0("datalayer_", output_tmp$id)
    output_fields <- c(output_tmp, "area_acres")
  } else {
    stand_thresholds <- get_stand_thresholds(scenario)
    output_fields <- c(outputs$condition_name, "area_acres")
  }

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
    scenario_output_fields = output_fields,
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
  summarized_metrics <- summarize_metrics(out, stand_data, data_inputs)
  out$project_output <- out$project_output |> left_join(summarized_metrics, by="proj_id")
  return(out)
}

delete_project_areas <- function(
    connection,
    scenario) {
  query <- glue_sql(
    "DELETE FROM planning_projectarea WHERE scenario_id = {scenario_id}",
    scenario_id = scenario$id,
    .con = connection
  )
  deletions <- dbExecute(connection, query, immediate = TRUE)

  return(deletions)
}

upsert_project_area <- function(
    connection,
    timestamp,
    scenario,
    project) {
  area_name <- glue("Project Area {area_number}", area_number = project$properties$proj_id)
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
    created_by_id = scenario$created_by_id,
    scenario_id = scenario$id,
    name = area_name,
    data = toJSON(project$properties),
    geometry = project$properties$text_geometry,
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
  if ("seed" %in% names(configuration)) {
    set.seed(configuration$seed)
  }
  treatment_goal <- get_treatment_goal_by_scenario_id(connection, scenario$id)
  datalayers <- get_treatment_goal_datalayers(connection, treatment_goal$id)
  priorities <- filter(datalayers, type == "RASTER", usage_type == "PRIORITY")
  secondary_metrics <- filter(datalayers, type == "RASTER", usage_type == "SECONDARY_METRIC")
  thresholds <- filter(datalayers, type == "RASTER", usage_type == "THRESHOLD")

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
      forsys_inputs <- data.table::rbindlist(
        list(priorities, secondary_metrics)
      )

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

      project_areas <- lapply(result$features, function(project) {
        return(upsert_project_area(connection, now, scenario, project))
      })

      print(paste("[OK] Forsys succeeeded for scenario", scenario_id))
    },
    error = function(e) {
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
      print("[DONE]")
    }
  )
}

main <- function(scenario_id) {
  now <- now_utc()
  connection <- get_connection()
  scenario <- get_scenario_by_id(connection, scenario_id)
  configuration <- get_configuration(scenario)
  if (!is.null(configuration$seed)) {
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
      project_areas <- lapply(result$features, function(project) {
        return(upsert_project_area(connection, now, scenario, project))
      })
    },
    error = function(e) {
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
      print(paste("[DONE] Forsys execution finished."))
    }
  )
}
