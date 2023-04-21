suppressMessages({
  library(dplyr)
  library(forsys)
  library(patchmax)
  library(sf)
})

generate_projects_for_a_single_scenario <- function(
  forsys_input_data,
  priorities,
  conditions,
  priority_weights,
  stand_id_field,
  proj_id_field,
  stand_area_field,
  stand_cost_field,
  geo_wkt_field,
  eligibility_field,
  output_scenario_name,
  output_scenario_tag,
  enable_kmeans_clustering = FALSE,
  max_cost_per_project_in_usd,
  max_area_per_project_in_km2
) {
  wp_str <- "weighted_priorities"

  # Enables debug mode if output_scenario_name and output_scenario_tag are
  # non-empty.
  # If enabled, data and graphs are output to directory,
  # output/<output_scenario_name>/<output_scenario_tag>/
  enable_debug <- (
    nchar(output_scenario_name) > 0 &&
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
  forsys_input_data <- forsys_input_data %>%
    mutate("geometry" = .data[[geo_wkt_field]]) %>%
    st_as_sf(wkt = "geometry")

  # Grouping raster cells into stands using k-means clustering
  if (enable_kmeans_clustering) {
    source("forsys/kmeans_cluster_cells_to_stands.R")
    # Clustering function uses latitude and longitude of raster cell centroids
    # as well as project priority values in order to group similar cells
    # together into stand polygons.
    forsys_input_data <- kmeans_cluster_cells_to_stands(
      stand_data = forsys_input_data,
      stand_id_field = stand_id_field,
      stand_area_field = stand_area_field,
      stand_cost_field = stand_cost_field,
      scenario_priorities = c(wp_colname, priorities),
      wp_colname = wp_colname,
      geo_wkt_field = geo_wkt_field)

    # geo_wkt_field column gets lost during clustering because the polygon
    # aggregation happens on the "geometry" sf field. This adds wkt back in.
    forsys_input_data <- forsys_input_data %>%
      mutate({{geo_wkt_field}} := st_as_text(geometry))
  }

  # These are used for setting per-project constraints for cost.
  proj_target_field = NULL
  proj_target_value = NULL
  proj_fixed_target = FALSE

  # Add cost-per-project params only if needed
  if (!identical(max_cost_per_project_in_usd, "")) {
    proj_target_field = stand_cost_field
    proj_target_value = as.double(max_cost_per_project_in_usd)
    proj_fixed_target = TRUE
  }


  # TODO: optimize project area generation parameters, SDW, EPW, sample_frac.
  suppressMessages(
    run_outputs <- forsys::run(
      return_outputs = TRUE,
      write_outputs = enable_debug,
      stand_data = forsys_input_data,
      stand_area_field = stand_area_field,
      stand_id_field = stand_id_field,
      proj_id_field = proj_id_field,
      scenario_name = output_scenario_name,
      scenario_write_tags = output_scenario_tag,
      scenario_priorities = wp_colname,
      scenario_output_fields = c(
        priorities,
        stand_area_field,
        stand_cost_field),
      run_with_patchmax = TRUE,
      # target area per project? TODO: clarify what this does, and clarify
      # whether there's also a target cost per project.
      patchmax_proj_size = max_area_per_project_in_km2,
      # number of projects - TODO: clarify whether this should be a user input.
      patchmax_proj_number = 3,
      patchmax_SDW = 1,
      patchmax_EPW = 0.5,
      patchmax_sample_frac = 0.01,
      stand_threshold = paste0(eligibility_field, ">0"),
      patchmax_exclusion_limit = 0.1,
      # TODO: clarify how to set global constraints.
      proj_fixed_target = proj_fixed_target,
      proj_target_field = proj_target_field,
      proj_target_value = proj_target_value
    )
  )

  # Adds the input geo_wkt column to the stand output df.
  run_outputs$stand_output <- run_outputs$stand_output %>%
    mutate({{stand_id_field}} := as.integer(.data[[stand_id_field]])) %>%
    inner_join(forsys_input_data %>%
      select({{stand_id_field}}, {{geo_wkt_field}}),
      by = stand_id_field)

  # Writes additional debug information to directory,
  # output/<output_scenario_name>/<output_scenario_tag>/
  if (enable_debug) {
    source("forsys/write_debug_data_to_disk.R")
    write_debug_data_to_disk(
      output_dir = file.path('output', 
                             output_scenario_name,
                             output_scenario_tag),
      forsys_input_data = forsys_input_data,
      run_outputs = run_outputs,
      conditions = conditions,
      wp_colname = wp_colname,
      stand_id_field = stand_id_field,
      proj_id_field = proj_id_field
    )
  }
  return(run_outputs)
}
