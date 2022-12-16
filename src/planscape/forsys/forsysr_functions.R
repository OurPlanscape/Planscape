library(sf)
library(raster)
library(dplyr)
library(forsys)

#* Compute treatments using ForSysR
#* @parser json
#* @post /forsysr_patchmax
#* @serializer json
function(rasterstack, thresholds, constraints) {
  
  data(test_forest)
  
  library(Patchmax)
  
  # create an object describing stand adjacency
  adj <- Patchmax::calculate_adj(
    Shapefile = test_forest,
    St_id = test_forest$stand_id,
    method = 'buffer')
  dist <- Patchmax::calculate_dist(Shapefile = test_forest)

  run_outputs <- forsys::run(
    return_outputs = TRUE,
    stand_data = stand_dat,
    scenario_name = 'test_forest_run4_patchmax',
    stand_id_field = 'stand_id',
    proj_id_field = 'proj_id',
    stand_area_field = 'area_ha',
    stand_threshold = 'threshold2 >= 1',
    scenario_priorities = 'priority2',
    scenario_output_fields = c(
      'area_ha',
      'priority1',
      'priority2',
      'priority3',
      'priority4'),
    run_with_patchmax = TRUE,
    patchmax_stnd_adj = adj,
    patchmax_proj_size = 25000,
    patchmax_proj_number = 5,
    patchmax_st_distance = dist
  )

  return(run_outputs)
}

#* Compute treatments using ForSysR
#* @parser json
#* @post /forsysr_treatment
#* @serializer json
#* function(rasterstack, thresholds, constraints) {

data(test_forest)

stand_dat <- test_forest %>% st_drop_geometry()
run_outputs <- forsys::run(
  return_outputs = TRUE,
  scenario_name = 'test_forest_run3_threshold',
  stand_data = stand_dat,
  stand_id_field = 'stand_id',
  proj_id_field = 'proj_id',
  stand_area_field = 'area_ha',
  stand_threshold = 'threshold2 >= 1 & ownership >= 2',
  scenario_priorities = 'priority1',
  scenario_weighting_values = c('0 5 1'),
  scenario_output_fields = c(
    'area_ha',
    'priority1',
    'priority2',
    'priority3',
    'priority4'),
  proj_fixed_target =  TRUE,
  proj_target_field = 'area_ha',
  proj_target_value = 2000
)

return(run_outputs)
}