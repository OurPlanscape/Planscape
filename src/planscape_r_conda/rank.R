times2 <- function(number) {
  library(forsys)
  library(patchmax)
  library(sf)
  library(dplyr)
  
  stand_dat <- forsys::test_forest

  # TODO: replace with an example that uses patchmax
  # Why is the min value for proj_target_value=100 for this dataset?
   run_outputs <- forsys::run(
     return_outputs = TRUE,
     run_with_patchmax = FALSE,
     write_outputs = FALSE,
     scenario_name = "test_scenario",
     stand_data = stand_dat,
     stand_id_field = "stand_id",
     proj_id_field = "proj_id",
     stand_area_field = "area_ha",
     scenario_priorities = "priority1",
     scenario_output_fields = c("area_ha", "priority1", "priority2", "priority3", "priority4"),
     proj_fixed_target =  TRUE,
     proj_target_field = "area_ha",
     proj_target_value = 100
   )
   return(run_outputs)
}
