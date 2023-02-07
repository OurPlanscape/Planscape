suppressMessages({
  library(dplyr)
  library(forsys)
  library(sf)
})

rank_projects_for_multiple_scenarios <- function(input_stand_data,
                                                 priorities,
                                                 stand_id_field,
                                                 proj_id_field,
                                                 stand_area_field,
                                                 stand_cost_field) {

  scenario_output_fields <- c(priorities, stand_area_field, stand_cost_field)

  suppressMessages (
    run_outputs <- forsys::run(
      return_outputs = TRUE,
      write_outputs = FALSE,
      stand_data = input_stand_data,
      stand_id_field = stand_id_field,
      proj_id_field = proj_id_field,
      stand_area_field = stand_area_field,
      scenario_priorities = priorities,
      scenario_weighting_values = c("1 5 1"),
      scenario_output_fields = scenario_output_fields, 
      proj_fixed_target =  FALSE,
      proj_target_field = stand_area_field,
      proj_target_value = 1.0
    )
  )

  return(run_outputs)
}
