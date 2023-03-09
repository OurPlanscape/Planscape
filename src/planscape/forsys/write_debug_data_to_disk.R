suppressMessages({
library(dplyr)
library(ggplot2)
library(ggnewscale)
library(sf)
})

write_debug_data_to_disk <- function(output_dir,
                                     forsys_input_data,
                                     run_outputs,
                                     conditions,
                                     wp_colname,
                                     stand_id_field,
                                     proj_id_field) {
    # Writes the input to a shape file.
    st_write(
      obj = forsys_input_data,
      file.path(output_dir, "forsys_input_data.shp"))

    # Graphs conditions and weighted priorities.
    for (p in conditions) {
      ggplot(data = forsys_input_data) + 
        geom_sf(mapping = aes_string(fill = p), color = NA) +
        scale_fill_viridis_c(begin = 0, end = 1, option = "turbo") +
        guides(fill = guide_colorbar(title = p))
      ggsave(file.path(output_dir, paste(p, ".pdf")))
    }
    ggplot(data = forsys_input_data) + 
      geom_sf(mapping = aes_string(fill = wp_colname), color = NA) +
      scale_fill_viridis_c(begin = 0, end = 1, option = "turbo") +
      guides(fill = guide_colorbar(title = wp_colname))
    ggsave(file.path(output_dir, paste(wp_colname, '.pdf')))

    # Gets projects.
    stand_output_ids <- run_outputs$stand_output %>%
      select({{stand_id_field}}, {{proj_id_field}})
    stand_output_ids[stand_id_field] <- 
      lapply(stand_output_ids[stand_id_field], as.integer)
    stand_output_ids[proj_id_field] <- 
      lapply(stand_output_ids[proj_id_field], as.character)

    forsys_input_data_w_updated_project_ids <- forsys_input_data %>%
      # If a proj_id_field was provided in the forsys_input_data it needs to
      # be removed here because forsys has generated different projects.
      select(-{{proj_id_field}}) %>%
      left_join(., stand_output_ids, by = stand_id_field)

    # Graphs weighted priorities in grayscale and project areas in reds.
    ggplot(data = forsys_input_data_w_updated_project_ids) +
      geom_sf(
        mapping = aes_string(fill = wp_colname),
        color = NA) +
      scale_fill_gradient(low = "black", high = "white") +
      guides(fill = guide_legend(title = wp_colname)) +
      new_scale_fill() +
      geom_sf(
        mapping = aes_string(fill = proj_id_field),
        color = NA) +
      scale_fill_brewer(palette = "OrRd") +
      guides(fill = guide_legend(title = proj_id_field))
    ggsave(file.path(output_dir, paste(wp_colname, '_with_projects.pdf')))
}