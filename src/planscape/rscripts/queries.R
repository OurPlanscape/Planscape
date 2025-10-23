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

get_stand_metrics <- function(connection, datalayer, stand_ids) {
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
