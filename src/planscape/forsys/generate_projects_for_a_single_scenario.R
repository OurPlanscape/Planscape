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
                                                    geo_wkt_field,
                                                    output_scenario_name,
                                                    output_scenario_tag) {
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
                  new_field = 'weighted_priorities')
  # Parses wkt in the geo_wkt column and adds it to a "geometry" column.
  # Patchmax expects column name to be "geometry" - do not change the variable
  # name.
  # Internally, Patchmax calls st_sf on geometry column values. This results in
  # an error unless st_as_sfc is called on the wkt first.
  geometry = lapply(forsys_input_data[geo_wkt_field], st_as_sfc)
  forsys_input_data <- cbind(forsys_input_data, geometry)

  # Enables debug mode if output_scenario_name and output_scenario_tag are
  # non-empty.
  # If enabled, data is output to directory,
  # output/<output_scenario_name>/<output_scenario_tag>/
  enable_debug <- nchar(output_scenario_name) > 0 && 
    nchar(output_scenario_tag) > 0

  # TODO: optimize project area generation parameters, SDW, EPW, sample_frac.
  suppressMessages (
    run_outputs <- forsys::run(
      return_outputs = TRUE,
      write_outputs = enable_debug,
      scenario_name = output_scenario_name,
      scenario_write_tags = output_scenario_tag,
      stand_data = forsys_input_data,
      stand_id_field = stand_id_field,
      proj_id_field = proj_id_field,
      stand_area_field = stand_area_field,
      scenario_priorities = c("weighted_priorities"),
      scenario_output_fields = c(priorities,
                                 stand_area_field,
                                 stand_cost_field),
      run_with_patchmax = TRUE,
      # target area per project? TODO: clarify what this does, and clarify
      # whether there's also a target cost per project.
      patchmax_proj_size = 30000, 
       # number of projects - TODO: clarify whether this should be a user input.
      patchmax_proj_number = 3,
      patchmax_SDW = 0.5,
      patchmax_EPW = 0.5, 
      patchmax_sample_frac = 0.01,
      # TODO: clarify how to set global constraints.
      proj_fixed_target = FALSE,
      proj_target_field = stand_area_field,
      proj_target_value = 0.5
    )
  )

  # Adds the input geo_wkt column to the stand output df.
  input_stand_ids_and_geometries = select(forsys_input_data,
                                          c(stand_id_field, geo_wkt_field)) 
  run_outputs$stand_output <- merge(run_outputs$stand_output, 
                                    input_stand_ids_and_geometries,
                                    by=stand_id_field)

  # Writes additional debug information to directory,
  # output/<output_scenario_name>/<output_scenario_tag>/
  if (enable_debug) {
    output_dir = file.path('output', output_scenario_name, output_scenario_tag)
    st_write(forsys_input_data, file.path(output_dir, 'forsys_input_data.shp'))
  }

  return(run_outputs)
}
