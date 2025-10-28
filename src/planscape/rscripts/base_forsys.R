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
  cost_field <- "estimated_cost"
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
  attainment <- forsys_project_outputs %>% 
    filter(proj_id == project_id) %>% 
    select(contains("attain_")) %>% 
    rename_with(~ str_replace(.x, "attain_", ""))
  project_data <- forsys_project_outputs %>%
    filter(proj_id == project_id) %>%
    select(-contains("Pr_1")) %>%
    select(-contains("attain_")) %>%
    mutate(stand_count = project_stand_count) %>%
    mutate(total_cost = ETrt_area_acres * scenario_cost_per_acre) %>%
    mutate(cost_per_acre = scenario_cost_per_acre) %>%
    mutate(pct_area = round(100 * ETrt_area_acres / scenario$planning_area_acres, 2)) %>%
    mutate(attainment = attainment) %>%
    mutate(text_geometry = text_geometry) %>%
    rename_with(.fn = rename_col)
  

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
  treatable_project_stand_ids <- select(
    filter(
      forsys_outputs$stand_output,
      proj_id == project_id,
      DoTreat == 1
    ),
    stand_id
  )
  treatable_project_stand_ids <- as.integer(treatable_project_stand_ids$stand_id)
  geometry <- get_project_geometry(connection, treatable_project_stand_ids)
  text_geometry <- get_project_geometry_text(connection, treatable_project_stand_ids)

  all_project_stand_ids <- select(
    filter(
      forsys_outputs$stand_output,
      proj_id == project_id
    ),
    stand_id
  )
  stand_count <- nrow(all_project_stand_ids)
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

get_metric_data <- function(connection, stands, datalayer) {
  datalayer_id <- datalayer$id
  datalayer_name <- datalayer$name
  field_name <- paste0("datalayer_", datalayer_id)

  metric <- get_stand_metrics(
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

get_stand_data_from_list <- function(connection, stand_ids, datalayers) {
  query <- glue_sql(
    "SELECT
      id AS stand_id,
      ST_Transform(geometry, 5070) AS geometry,
      ST_Area(geometry::geography, TRUE) / 4047 AS area_acres
     FROM stands_stand
     WHERE id IN ({stand_ids*})",
    stand_ids = stand_ids,
    .con = connection
  )
  stand_data <- st_read(
    dsn = connection,
    layer = NULL,
    query = query,
    geometry_column = "geometry",
    crs = st_crs(5070)
  )
  datalayers <- remove_duplicates(datalayers)
  for (row in seq_len(nrow(datalayers))) {
    datalayer <- datalayers[row, ]
    metric <- get_metric_data(connection, stand_data, datalayer)
    stand_data <- merge_data(stand_data, metric)
  }  
  return(stand_data)
}

get_configuration <- function(scenario) {
  configuration <- fromJSON(toString(scenario[["configuration"]]))
  return(configuration)
}

get_forsys_input <- function(scenario) {
  forsys_input <- fromJSON(toString(scenario[["forsys_input"]]))
  return(forsys_input)
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

  target_count <- nrow(remove_duplicates(priorities))

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
  configuration <- get_configuration(scenario)
  return(configuration$max_project_count)
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

get_stand_thresholds <- function(connection, datalayers) {
  # max_slope and distance_from_roads are already included in datalayers
  all_thresholds <- c()

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

remove_duplicates <- function(dataframe) {
  return(dataframe %>% distinct(id, .keep_all = TRUE))
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
  geometry <- project$properties$text_geometry
  properties <- project$properties[names(project$properties) != "text_geometry"]
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
    data = toJSON(properties),
    geometry = geometry,
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

upsert_result_status <- function(
    connection,
    scenario_id,
    result_status) {
  query <- glue_sql("UPDATE planning_scenario
    SET result_status = {result_status}
    WHERE id = {scenario_id}",
    result_status = result_status,
    scenario_id = scenario_id,
    .con = connection
  )
  dbExecute(connection, query, immediate = TRUE)
}

upsert_scenario_result_statuses <- function(
  connection,
  scenario_id,
  timestamp,
  start_time,
  finish_time,
  status,
  result = NULL
) {
  if (is.null(result)) {
    result = list(type = "FeatureCollection", features = list())
  }

  upsert_scenario_result(
    connection,
    timestamp,
    started_at = start_time,
    completed_at = finish_time,
    scenario_id,
    status,
    result
  )

  upsert_result_status(
    connection,
    scenario_id,
    status
  )
}

call_forsys <- function(
  connection, 
  scenario, 
  stand_data, 
  variables, 
  priorities, 
  secondary_metrics, 
  thresholds) {
  tryCatch(
    expr = {
      data_inputs <- data.table::rbindlist(list(priorities, secondary_metrics))
      weights <- get_weights(priorities, get_configuration(scenario))
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

      number_of_projects <- variables$number_of_projects
      min_area_project <- variables$min_area_project
      max_area_project <- variables$max_area_project
      sdw <- variables$spatial_distribution_weight
      epw <- variables$edge_proximity_weight
      sample_frac <- variables$sample_frac
      exclusion_limit <- variables$exclusion_limit
      seed <- variables$seed
      print(
        paste0(
          "variables fields | ",
          "number_of_projects: ", number_of_projects, 
          " min_area_project: ", min_area_project,
          " max_area_project: ", max_area_project, 
          " sdw: ", sdw, 
          " epw: ", epw, 
          " sample_frac: ", sample_frac, 
          " exclusion_limit: ", exclusion_limit, 
          " seed:", seed
        )
      )
      
      stand_thresholds <- get_stand_thresholds(connection, thresholds)
      forsys_inputs <- data.table::rbindlist(list(priorities, secondary_metrics, thresholds))
      output_tmp <- forsys_inputs %>%
        remove_duplicates() %>%
        select(id)
      output_tmp <- paste0("datalayer_", output_tmp$id)
      output_fields <- c(output_tmp, "area_acres")

      export_input(scenario, stand_data)
    },
    error = function(e) {
      e$status <- "PANIC"
      stop(e)
    }
  )
  
  tryCatch(
    expr = {
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
        patchmax_sample_seed = seed
      )
      summarized_metrics <- summarize_metrics(out, stand_data, data_inputs)
      attain_cols <- grep("^attain_", names(out$project_output), value = TRUE)
      out$project_output <- out$project_output[, setdiff(names(out$project_output), attain_cols), drop = FALSE]
      out$project_output <- out$project_output |> left_join(summarized_metrics, by = "proj_id")
      return(out)
    },
    error = function(e) {
      e$status <- "FAILURE"
      stop(e)
    }
  )
  
}

# Forsys execution with pre-processed stand data
main <- function(scenario_id) {
  now <- now_utc()
  connection <- get_connection()
  tryCatch(
    expr = {
      print(paste("[START]", now, "Scenario ID:", scenario_id))
      scenario <- get_scenario_by_id(connection, scenario_id)
      forsys_input <- get_forsys_input(scenario)

      datalayers <- data.table::rbindlist(forsys_input$datalayers)
      priorities <- filter(datalayers, type == "RASTER", usage_type == "PRIORITY")
      secondary_metrics <- filter(datalayers, type == "RASTER", usage_type == "SECONDARY_METRIC")
      thresholds <- filter(datalayers, type == "RASTER", usage_type == "THRESHOLD")

      stand_ids <- forsys_input$stand_ids
      datalayers <- remove_duplicates(datalayers)
      stand_data <- get_stand_data_from_list(connection, stand_ids, datalayers)

      variables <- forsys_input$variables
    },
    error = function(e) {
      completed_at <- now_utc()
      upsert_scenario_result_statuses(
        connection,
        scenario_id,
        now,
        now,
        completed_at,
        "PANIC"
      )
      print(paste("[OK] Forsys PANIC for scenario", scenario_id))
      print("[DONE - EARLY EXIT]")
      stop(e)
    }
  )

  tryCatch(
    expr = {
      forsys_output <- call_forsys(
        connection,
        scenario,
        stand_data,
        variables,
        priorities,
        secondary_metrics,
        thresholds
      )

      completed_at <- now_utc()
      result <- to_projects(
        connection,
        scenario,
        forsys_output
      )

      upsert_scenario_result_statuses(
        connection,
        scenario_id,
        now,
        now,
        completed_at,
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
      upsert_scenario_result_statuses(
        connection,
        scenario_id,
        now,
        now,
        completed_at,
        e$status
      )
      print(paste("[OK] Forsys", e$status, "for scenario", scenario_id))
      stop(e)
    },
    finally = {
      print("[DONE]")
    }
  )
}
