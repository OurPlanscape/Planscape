suppressMessages({
  library(dplyr)
  library(forsys)
  library(sf)
})

rank_projects_for_a_single_scenario <- function(input_stand_data,
                                                priorities,
                                                priorities_pcp,
                                                priority_weights,
                                                stand_id_field,
                                                proj_id_field,
                                                stand_area_field,
                                                stand_cost_field) {

  scenario_output_fields <- c(priorities, stand_area_field, stand_cost_field)

  stand_data <- input_stand_data %>% 
                forsys::calculate_spm(fields = priorities) %>%
                forsys::calculate_pcp(fields = priorities)
  stand_data <- stand_data %>%
                forsys::combine_priorities(fields = priorities_pcp, 
                                            weights = priority_weights, 
                                            new_field = 'preset_priority')

  suppressMessages (
    run_outputs <- forsys::run(
      return_outputs = TRUE,
      write_outputs = FALSE,
      stand_data = stand_data,
      stand_id_field = stand_id_field,
      proj_id_field = proj_id_field,
      stand_area_field = stand_area_field,
      scenario_priorities = c("preset_priority"),
      scenario_output_fields = scenario_output_fields, 
      proj_fixed_target =  FALSE,
      proj_target_field = stand_area_field,
      proj_target_value = 1.0,
    )
  )

  return(run_outputs)
}
