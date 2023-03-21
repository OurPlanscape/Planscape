times2 <- function(number) {
  library(forsys)
  library(sf)
  library(dplyr)
  
  stand_dat <- test_forest %>% st_drop_geometry()

   run_outputs <- forsys::run(
     return_outputs = FALSE,
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
     proj_target_value = 2000
   )
   return(run_outputs)
}
