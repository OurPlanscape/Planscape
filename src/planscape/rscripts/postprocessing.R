summarize_metrics <- function(forsys_output, stand_data, datalayers) {
  fields <- paste0("sum_datalayer_", datalayers[["id"]])
  output_fields <- datalayers[["name"]]
  lookup <- setNames(fields, output_fields)

  stand_output <- forsys_output$stand_output |> 
    select(stand_id, proj_id, DoTreat, weightedPriority) |>
    mutate(stand_id = as.integer(stand_id)) |> 
    left_join(stand_data, by="stand_id")

  summarized_metrics <- stand_output |> group_by(proj_id) |> summarize(across(all_of(fields), sum, .names = "sum_{col}")) |> rename(all_of(lookup))
  summarized_metrics
}
