suppressMessages({
  library(dplyr)
  library(sf)
  library(forsys)
  library(patchmax)
  library(ggplot2)
  library(ggnewscale)
})

generate_projects_for_a_single_scenario <- function(forsys_input_data,
                                                    priorities,
                                                    conditions,
                                                    priority_weights,
                                                    stand_id_field,
                                                    proj_id_field,
                                                    stand_area_field,
                                                    stand_cost_field,
                                                    geo_wkt_field,
                                                    output_scenario_name,
                                                    output_scenario_tag) {
  wp_str <- "weighted_priorities"
  # Enables debug mode if output_scenario_name and output_scenario_tag are
  # non-empty.
  # If enabled, data and graphs are output to directory,
  # output/<output_scenario_name>/<output_scenario_tag>/
  enable_debug <- nchar(output_scenario_name) > 0 && 
    nchar(output_scenario_tag) > 0

  priority_impact_fields <- paste(priorities, "_PCP", sep="")

  # Appends spm and pcp data columns for each priority.
  forsys_input_data <- forsys_input_data %>% 
                forsys::calculate_spm(fields = priorities) %>%
                forsys::calculate_pcp(fields = priorities)
  # Appends a preset_priority column, which contains total impact score values.
  suppressMessages(
    forsys_input_data <- forsys_input_data %>%
                  forsys::combine_priorities(
                    fields = priority_impact_fields, 
                    weights = priority_weights, 
                    new_field = wp_str)
  )
  # Parses wkt in the geo_wkt column and adds it to a "geometry" column.
  # Patchmax expects column name to be "geometry" - do not change the variable
  # name.
  # Internally, Patchmax calls st_sf on geometry column values. This results in
  # an error unless st_as_sfc is called on the wkt first.
  geometry <- lapply(forsys_input_data[geo_wkt_field], st_as_sfc)
  forsys_input_data <- cbind(forsys_input_data, geometry)

  shp <- st_as_sf(forsys_input_data)

  # TODO: optimize project area generation parameters, SDW, EPW, sample_frac.
  suppressMessages (
    run_outputs <- forsys::run(
      return_outputs = TRUE,
      write_outputs = enable_debug,
      scenario_name = output_scenario_name,
      scenario_write_tags = output_scenario_tag,
      stand_data = shp,
      stand_id_field = stand_id_field,
      proj_id_field = proj_id_field,
      stand_area_field = stand_area_field,
      scenario_priorities = c(wp_str),
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
  input_stand_ids_and_geometries <- select(forsys_input_data,
                                           c(stand_id_field, geo_wkt_field)) 
  run_outputs$stand_output[stand_id_field] <- lapply(
    run_outputs$stand_output[stand_id_field], as.integer)
  run_outputs$stand_output <- inner_join(run_outputs$stand_output, 
                                         input_stand_ids_and_geometries,
                                         by=stand_id_field)

  # Writes additional debug information to directory,
  # output/<output_scenario_name>/<output_scenario_tag>/
  if (enable_debug) {
    output_dir = file.path('output', output_scenario_name, output_scenario_tag)
    # Writes the input to a shape file.
    st_write(shp, file.path(output_dir, 'forsys_input_data.shp'))
    # Graphs priorities and weighted priorities.
    for (p in conditions) {
      ggplot() + 
        geom_sf(data=shp, mapping=aes(fill=get(p)), color=NA) +
        scale_fill_viridis_c(begin=0, end=1, option="turbo") +
        guides(fill=guide_colorbar(title=p))
      ggsave(file.path(output_dir, paste(p, '.pdf')))
    }
    ggplot() + 
      geom_sf(data=shp, mapping=aes(fill=weighted_priorities), color=NA) +
      scale_fill_viridis_c(begin=0, end=1, option="turbo") +
      guides(fill=guide_colorbar(title=wp_str))
    ggsave(file.path(output_dir, paste(wp_str, '.pdf')))
    # Gets projects.
    x <- run_outputs$stand_output %>% select(stand_id_field, proj_id_field)
    x[stand_id_field] <- lapply(x[stand_id_field], as.integer)
    y <- shp %>% select(stand_id_field, 'geometry')
    joined <- x %>% inner_join(y, by=stand_id_field)
    joined <- st_sf(joined)
    joined[proj_id_field] <- lapply(joined[proj_id_field], as.character)
    # Graphs weighted priorities in grayscale and project areas in reds.
    ggplot() + 
      geom_sf(data=shp, mapping=aes(fill=weighted_priorities), color=NA) +
      scale_fill_gradient(low="black", high="white") +
      guides(fill=guide_legend(title=wp_str)) +
      new_scale_fill() +
      geom_sf(data=joined, mapping=aes(fill=get(proj_id_field)), color=NA) +
      scale_fill_brewer(palette="OrRd") +
      guides(fill=guide_legend(title=proj_id_field))
    ggsave(file.path(output_dir, paste(wp_str, '_with_projects.pdf')))
  }

  return(run_outputs)
}
