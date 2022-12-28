scenario_sets <- function(input_stand_data, max_area, priorities) {
  library(forsys)
  library(sf)
  library(dplyr)

  stand_dat <- test_forest %>% st_drop_geometry()
  run_outputs <- forsys::run(
    return_outputs = TRUE,
    scenario_name = "test_scenario",
    stand_data = input_stand_data,
    stand_id_field = "stand_id",
    proj_id_field = "proj_id",
    stand_area_field = "area",
    scenario_priorities = priorities,
    scenario_weighting_values = c("0 5 1"), 
    proj_fixed_target =  FALSE,
    proj_target_field = "area",
    proj_target_value = max_area
  )

  return(run_outputs)
}
