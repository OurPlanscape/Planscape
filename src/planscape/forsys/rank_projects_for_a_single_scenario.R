suppressMessages({
  library(dplyr)
  library(forsys)
  library(sf)
})

rank_projects_for_a_single_scenario <- function(forsys_input_data,
                                                priorities,
                                                priority_weights,
                                                stand_id_field,
                                                proj_id_field,
                                                stand_area_field,
                                                stand_cost_field) {

  scenario_output_fields <- c(priorities, stand_area_field, stand_cost_field)

  priority_impact_fields <- paste(priorities, "_PCP", sep="")

  # Appends spm and pcp data columns for each priority.
  forsys_input_data <- forsys_input_data %>% 
                forsys::calculate_spm(fields = priorities) %>%
                forsys::calculate_pcp(fields = priorities)
  # Appends a preset_priority column, which contains total impact score values.
  forsys_input_data <- forsys_input_data %>%
                forsys::combine_priorities(
                  fields = priority_impact_fields, 
                  weights = priority_weights, 
                  new_field = 'preset_priority')

  suppressMessages (
    run_outputs <- forsys::run(
      return_outputs = TRUE,
      write_outputs = FALSE,
      stand_data = forsys_input_data,
      stand_id_field = stand_id_field,
      proj_id_field = proj_id_field,
      stand_area_field = stand_area_field,
      scenario_priorities = c("preset_priority"),
      scenario_output_fields = c(priorities,
                                 stand_area_field,
                                 stand_cost_field), 
      proj_fixed_target =  FALSE,
      proj_target_field = stand_area_field,
      proj_target_value = 1.0,
    )
  )

  return(run_outputs)
}
