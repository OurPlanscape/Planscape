suppressMessages({
  library(dplyr)
  library(sf)
  library(forsys)
  library(patchmax)
})

generate_projects_for_a_single_scenario <- function(forsys_input_data,
                                                    priorities,
                                                    priority_weights,
                                                    stand_id_field,
                                                    proj_id_field,
                                                    stand_area_field,
                                                    stand_cost_field,
                                                    geo_wkt_field) {

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
  # Parses wkt in the geo_wkt column and adds it to a "geometry" column.
  geometry = lapply(forsys_input_data[geo_wkt_field], st_as_sfc)
  forsys_input_data <- cbind(forsys_input_data, geometry)

  # TODO: optimize project area generation parameters.
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
      run_with_patchmax = TRUE,
      patchmax_proj_size = 30000, # target area per project
      patchmax_proj_number = 3, # number of projects
      patchmax_SDW = 0.5,
      patchmax_EPW = 0.5, 
      patchmax_sample_frac = 0.01,
      proj_fixed_target = FALSE,
      proj_target_field = stand_area_field,
      proj_target_value = 0.5
    )
  )

  return(run_outputs)
}
