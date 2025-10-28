summarize_metrics <- function(forsys_output, stand_data, datalayers) {
  fields <- paste0("datalayer_", datalayers[["id"]])
  pcp_fields <- paste0("datalayer_", datalayers[["id"]], "_PCP")
  pcp_sum_fields <- paste0("sum_", pcp_fields)
  stand_data <- stand_data |> forsys::calculate_pcp(fields = fields)
  output_fields <- paste0("attain_", datalayers[["name"]])
  lookup <- setNames(pcp_sum_fields, output_fields)
  stand_output <- forsys_output$stand_output |>
    select(
      filter(DoTreat == 1), 
      stand_id, 
      proj_id, 
      DoTreat, 
      weightedPriority
    ) |>
    mutate(stand_id = as.integer(stand_id)) |>
    left_join(stand_data, by = "stand_id")

  summarized_metrics <- stand_output |>
    group_by(proj_id) |>
    summarize(across(all_of(pcp_fields), sum, .names = "sum_{col}")) |>
    rename(all_of(lookup))
  summarized_metrics
}
