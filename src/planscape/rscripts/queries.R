get_datalayer_by_id <- function(connection, datalayer_id) {
  query_text <- "SELECT * FROM datasets_datalayer WHERE id = {datalayer_id}"
  query <- glue_sql(query_text, datalayer_id = datalayer_id, .con = connection)
  result <- dbGetQuery(connection, query)
  return(tibble(head(result, 1)))
}

get_datalayer_by_forsys_attribute <- function(connection, attribute, value) {
  query_text <- "SELECT
                  *
                 FROM
                  datasets_datalayer dl
                 WHERE
                  dl.metadata @> '{{\"modules\": {{\"forsys\": {{{`attribute`}: {`value`} }}}}}}'"
  query <- glue_sql(
    query_text,
    attribute = attribute,
    value = value,
    .con = connection
  )
  result <- dbGetQuery(connection, query)
  return(tibble(head(result, 1)))
}

get_datalayer_by_forsys_name <- function(connection, datalayer_name) {
  return(get_datalayer_by_forsys_attribute(connection, "name", datalayer_name))
}

get_scenario_by_id <- function(connection, scenario_id) {
  query <- "SELECT
              s.id,
              s.user_id as \"created_by_id\",
              s.name,
              s.uuid,
              s.configuration,
              s.forsys_input,
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

get_treatment_goal_by_scenario_id <- function(connection, scenario_id) {
  query_text <- "
    SELECT
      t.*
    FROM planning_treatmentgoal t
    LEFT JOIN planning_scenario s ON (s.treatment_goal_id = t.id)
    WHERE s.id = {scenario_id}
  "
  query <- glue_sql(query_text, scenario_id = scenario_id, .con = connection)
  result <- dbGetQuery(connection, query)
  return(tibble(head(result, 1)))
}

get_treatment_goal_datalayers <- function(connection, treatment_goal_id) {
  query_text <- "
  SELECT
      d.id,
      d.name,
      d.type,
      d.geometry_type,
      udt.usage_type AS \"usage_type\",
      udt.threshold AS \"threshold\"
    FROM
      datasets_datalayer d
    LEFT JOIN
      planning_treatmentgoalusesdatalayer udt ON (udt.datalayer_id = d.id)
    WHERE
      udt.treatment_goal_id = {treatment_goal_id} AND
      udt.deleted_at IS NULL
  "

  query <- glue_sql(query_text, treatment_goal_id = treatment_goal_id, .con = connection)
  result <- dbGetQuery(connection, query)
  return(result)
}

get_datalayer_module_name <- function(datalayer) {
  if (is.null(datalayer$metadata)) {
    return(NULL)
  }
  metadata <- fromJSON(datalayer$metadata)
  datalayer_module_name <- metadata$modules$forsys$name
  datalayer_module_name
}

get_datalayer_metric <- function(datalayer) {
  if (is.null(datalayer$metadata)) {
    return("avg")
  }
  metadata <- fromJSON(datalayer$metadata)
  metric <- metadata$modules$forsys$metric_column
  if (is.null(metric)) {
    return("avg")
  }
  metric
}

get_stand_metrics_v2 <- function(connection, datalayer, stand_ids) {
  datalayer_id <- datalayer$id
  datalayer_name <- datalayer$name
  metric_column <- get_datalayer_metric(datalayer)
  field_name <- paste0("datalayer_", datalayer_id)
  query <- glue_sql(
    "SELECT
      stand_id,
      COALESCE({`metric_column`}, 0) AS {`field_name`}
     FROM stands_standmetric
     WHERE
       datalayer_id = {datalayer_id} AND
       stand_id IN ({stand_ids*})",
    datalayer_id = datalayer_id,
    datalayer_name = datalayer_name,
    metric_column = metric_column,
    field_name = field_name,
    stand_ids = stand_ids,
    .con = connection
  )
  result <- dbGetQuery(connection, query)
  return(result)
}

get_stand_metrics <- function(
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
