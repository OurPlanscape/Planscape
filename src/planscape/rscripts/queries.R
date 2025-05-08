get_datalayer_by_id <- function(connection, datalayer_id) {
  query_text <- "SELECT * FROM datasets.datalayer WHERE id = {datalayer_id}"
  query <- glue_sql(query_text, datalayer_id = datalayer_id, .con = connection)
  result <- dbGetQuery(connection, query)
  return(tibble(head(result, 1)))
}
