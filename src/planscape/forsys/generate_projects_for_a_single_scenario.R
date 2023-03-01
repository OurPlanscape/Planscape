suppressMessages({
  library(dplyr)
  library(sf)
  library(forsys)
  library(patchmax)
  library(ggplot2)
  library(ggnewscale)
  # TODO: remove below
  library(tidyverse)
})

generate_projects_for_a_single_scenario <- function(
  forsys_input_data,
  priorities,
  priority_weights,
  stand_id_field,
  proj_id_field,
  stand_area_field,
  stand_cost_field,
  geo_wkt_field,
  output_scenario_name,
  output_scenario_tag,
  PreForsysClusterType = 'KMEANS') {

  # Enables debug mode if providing output_scenario_name and output_scenario_tag
  # If enabled, data and graphs are output to directory,
  # output/<output_scenario_name>/<output_scenario_tag>/
  enable_debug <- (
    nchar(output_scenario_name) > 0 &
    nchar(output_scenario_tag) > 0)

  # Appends spm and pcp data columns for each priority.
  forsys_input_data <- forsys_input_data %>% 
    forsys::calculate_spm(fields = priorities) %>%
    forsys::calculate_pcp(fields = priorities)

  # Appends a preset_priority column, which contains total impact score values.
  priority_impact_fields <- paste0(priorities, "_PCP")
  wp_colname <- "weighted_priorities"
  suppressMessages(
    forsys_input_data <- forsys_input_data %>%
      forsys::combine_priorities(
        fields = priority_impact_fields,
        weights = priority_weights,
        new_field = wp_colname))

  # Parses wkt in the geo_wkt column and adds it to a "geometry" column.
  forsys_input_data_formatted <- forsys_input_data %>%
    rename("geometry" = geo_wkt_field) %>%
    st_as_sf(wkt = "geometry")

  # k-means clustering
  if (PreForsysClusterType == 'KMEANS') {
    # k-means clustering execution
    source("forsys/spatial_clustering.R")
    forsys_input_data_formatted <- cluster_cells_to_stands(
      stand_data = forsys_input_data_formatted,
      scenario_priorities = c(wp_colname, priorities))
  }

  print(head(forsys_input_data_formatted, n = 5))

  # TODO: optimize project area generation parameters, SDW, EPW, sample_frac.
  suppressMessages(
    run_outputs <- forsys::run(
      return_outputs = TRUE,
      write_outputs = enable_debug,
      stand_data = forsys_input_data_formatted,
      stand_area_field = stand_area_field,
      # TODO: do we want ownership or operability here?
      stand_threshold = paste(stand_area_field, " > 0"),
      stand_id_field = stand_id_field,
      proj_id_field = proj_id_field,
      scenario_name = output_scenario_name,
      scenario_write_tags = output_scenario_tag,
      scenario_priorities = wp_colname,
      scenario_output_fields = c(
        priorities,
        stand_area_field),
        # TODO: seems we're missing the cost field?
        #stand_cost_field),
      run_with_patchmax = TRUE,
      # target area per project? TODO: clarify what this does, and clarify
      # whether there's also a target cost per project.
      patchmax_proj_size = 20,
      # number of projects - TODO: clarify whether this should be a user input.
      patchmax_proj_number = 3,
      patchmax_SDW = 1,
      patchmax_EPW = 0.5,
      patchmax_sample_frac = 0.1,
      patchmax_exclusion_limit = 100,
      # TODO: clarify how to set global constraints.
      proj_fixed_target = FALSE,
      #proj_target_field = stand_area_field,
      #proj_target_value = 0.5
      )
    )

  print(head(run_outputs$stand_output, n = 5))

  # Adds the input geo_wkt column to the stand output df.
  input_stand_ids_and_geometries <- forsys_input_data %>%
    select(stand_id_field, {{geo_wkt_field}})
  run_outputs$stand_output[stand_id_field] <- lapply(
    run_outputs$stand_output[stand_id_field], as.integer)
  run_outputs$stand_output <- inner_join(run_outputs$stand_output, 
                                         input_stand_ids_and_geometries,
                                         by=stand_id_field)

  # Writes additional debug information to directory,
  # output/<output_scenario_name>/<output_scenario_tag>/
  if (enable_debug) {
    output_dir <- file.path('output', output_scenario_name, output_scenario_tag)
    # Writes the input to a shape file.
    st_write(
      obj = forsys_input_data_formatted,
      file.path(output_dir, 'forsys_input_data.shp'))
    # Graphs priorities and weighted priorities.
    for (p in priorities) {
      ggplot(data=forsys_input_data_formatted) + 
        geom_sf(mapping=aes(fill=get(p)), color=NA) +
        scale_fill_viridis_c(begin=0, end=1, option="turbo") +
        guides(fill=guide_colorbar(title=p))
      ggsave(file.path(output_dir, paste(p, '.pdf')))
    }
    ggplot(data=forsys_input_data_formatted) + 
      geom_sf(mapping=aes(fill=weighted_priorities), color=NA) +
      scale_fill_viridis_c(begin=0, end=1, option="turbo") +
      guides(fill=guide_colorbar(title=wp_colname))
    ggsave(file.path(output_dir, paste(wp_colname, '.pdf')))
    # Gets projects.
    x <- run_outputs$stand_output %>%
      select({{stand_id_field}}, {{proj_id_field}})
    x[stand_id_field] <- lapply(x[stand_id_field], as.integer)
    y <- forsys_input_data_formatted %>% select({{stand_id_field}}, 'geometry')
    joined <- x %>% inner_join(y, by=stand_id_field)
    joined <- st_sf(joined)
    joined[proj_id_field] <- lapply(joined[proj_id_field], as.character)
    # Graphs weighted priorities in grayscale and project areas in reds.
    ggplot(data=forsys_input_data_formatted) + 
      geom_sf(mapping=aes(fill=weighted_priorities), color=NA) +
      scale_fill_gradient(low="black", high="white") +
      guides(fill=guide_legend(title=wp_colname)) +
      new_scale_fill() +
      geom_sf(data=joined, mapping=aes(fill=get(proj_id_field)), color=NA) +
      scale_fill_brewer(palette="OrRd") +
      guides(fill=guide_legend(title=proj_id_field))
    ggsave(file.path(output_dir, paste(wp_colname, '_with_projects.pdf')))
  }
  return(run_outputs)
}
