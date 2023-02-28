times2 <- function(number) {
  .libPaths()
  install.packages("devtools")
  library(devtools)
  build("/usr/lib64/R/library/forsysr")

  
  library(sf)
  library(dplyr)

  data(test_forest)

  stand_dat <- test_forest %>% st_drop_geometry()
  
  run_outputs <- forsys::run(
    return_outputs = TRUE,
    scenario_name = "test_scenario",
    stand_data = stand_dat,
    stand_id_field = "stand_id",
    proj_id_field = "proj_id",
    stand_area_field = "area_ha",
    scenario_priorities = "priority1",
    scenario_output_fields = c("area_ha", "priority1", "priority2", "priority3", "priority4"),
    proj_fixed_target =  TRUE,
    proj_target_field = "area_ha",
    proj_target_value = number
  )

  return(run_outputs)
}
