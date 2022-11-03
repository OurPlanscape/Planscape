#' ForSysR Tutorial
#' 
#' Here we will provide a short example showing how the forsys package can be
#' used to build and solve simple multi-objective landscape management problems.
#' For brevity, we will use one of the built-in simulated datasets that is
#' distributed with the package. The code is based on the ForSysR tutorial from
#' the GitHub README.md but contains some modifications to the run parameters
#' and visualisations.

library(forsys)
library(sf)
library(tidyverse)

#' Although forsys can support many different types of treatment unit data,
#' here our treatment units are represented as polygons in a spatial vector
#' format. Each polygon represents a different treatment unit.

# load treatment unit data
data(test_forest)
# show the first rows in the attribute table
glimpse(test_forest)
# plot the treatment units
plot_vars <- c('stand_id', 'proj_id', 'priority1', 'priority2', 'priority3', 'priority4', 'threshold1', 'threshold2', 'ownership')
for (plot_var in plot_vars) {
  ggp <- test_forest %>%
    ggplot(aes_string(fill = plot_var)) +
    geom_sf(color = NA) +
    scale_fill_distiller(palette = 'Spectral') +
    theme_minimal()
  ggsave(paste0('analysis/output/test_forest/input_data_plots/', plot_var, '.jpg'))
}


## 1 Running a ForSys Scenario ---------------------------------------------------

#' Forsys prioritizes projects by maximizing an objective given one or more
#' constraints. The objectives represent one or more management priorities while
#' the constraints may include a maximum cost or area treated. Thresholds are
#' environmental or categorical conditions that trigger the need to treat an
#' indiviudal treatment unit or stand (e.g., a particular ownership or minimum
#' forest cover). Forsys then builds projects and ranks them in order of their
#' priority. Projects can be either predefined units (e.g., watersheds) or can
#' be built dynamically.
#' 
#' Let’s set up a very simple forsys run to see how things work. We’ll use the
#' test_forest data shown above. We want to find the top 2000 ha within each
#' predefined project based on ‘priority1’.
plot(test_forest[,c('proj_id','priority1')], border = NA)

#' We run forsys with the following arguments. Remember that these can also be
#' run using the json config file, as described above. Forsys always writes its
#' outputs to csv files saved within the output folder, but we can optionally
#' set it to write that data out to a list which has three elements containing
#' the outputs.
stand_dat <- test_forest %>% st_drop_geometry()

run_outputs <- forsys::run(
  return_outputs = TRUE,
  scenario_name = 'test_forest_run1_simple',
  stand_data = stand_dat,
  stand_id_field = 'stand_id',
  proj_id_field = 'proj_id',
  stand_area_field = 'area_ha',
  scenario_priorities = 'priority1',
  scenario_output_fields = c('area_ha', 'priority1', 'priority2', 'priority3', 'priority4'),
  proj_fixed_target =  TRUE,
  proj_target_field = 'area_ha',
  proj_target_value = 2000
)

#' Not surprisingly, the treatment rank of the projects selected corresponds
#' directly to those areas where are priority was highest, as plotted below.
#' Projeck rank #1 (darkest blue) is the highest ranked project.
test_forest %>%
  group_by(proj_id) %>%
  summarize() %>%
  left_join(
    y = select(run_outputs$project_output, proj_id, treatment_rank),
    by = 'proj_id') %>%
  ggplot(aes(fill = 100 - treatment_rank)) +
  geom_sf(color = NA) +
  scale_fill_distiller(palette = 'Spectral') +
  theme_minimal()

#' Below we plot the stands rather than the project rank and only retain
#' those stands that were treated.
test_forest %>%
  select(stand_id, proj_id) %>%
  inner_join(select(run_outputs$stand_output, stand_id)) %>%
  left_join(select(run_outputs$project_output, proj_id, treatment_rank)) %>%
  ggplot(aes(fill = 100 - treatment_rank)) +
  geom_sf(color = NA) +
  scale_fill_distiller(palette = 'Spectral') +
  theme_minimal()


## 2 Multiple priorities ---------------------------------------------------------

#' Next we look at multiple priorities. Plotting priorities 1 and 2 shows that
#' areas where priority 1 are highest tend to be lower for priority 2.
test_forest %>%
  ggplot(aes(fill = priority1)) +
  geom_sf(color = NA) +
  scale_fill_distiller(palette = 'Spectral') +
  theme_minimal()
test_forest %>%
  ggplot(aes(fill = priority2)) +
  geom_sf(color = NA) +
  scale_fill_distiller(palette = 'Spectral') +
  theme_minimal()

#' Let’s see if forsys can find locations where we can achieve both objectives.
#' We prioritize on both variables, priority1 and priority2. We run forsys
#' weighting the two objectives from 0 to 5, which results in 21 scenarios.
#' We then filter the results to observe the outcome of the scenario where the
#' two objectives are equally weighted. The project rank graph represents areas
#' that are highest in both priorities.
run_outputs_2 <- forsys::run(
  return_outputs = TRUE,
  scenario_name = 'test_forest_run2_scenarios',
  stand_data = stand_dat,
  stand_id_field = 'stand_id',
  proj_id_field = 'proj_id',
  stand_area_field = 'area_ha',
  scenario_priorities = c('priority1','priority2'),
  scenario_weighting_values = c('0 5 1'),
  scenario_output_fields = c('area_ha', 'priority1', 'priority2', 'priority3', 'priority4'),
  proj_fixed_target =  TRUE,
  proj_target_field = 'area_ha',
  proj_target_value = 2000
)

test_forest %>%
  group_by(proj_id) %>%
  summarize() %>%
  left_join(
    run_outputs_2$project_output %>%
    filter(Pr_1_priority1 == 1 & Pr_2_priority2 == 1) %>%
    select(proj_id, treatment_rank),
    by = 'proj_id') %>%
  ggplot(aes(fill = treatment_rank)) +
  geom_sf(color = NA) +
  scale_fill_distiller(palette = 'Spectral') +
  theme_minimal()


## 3 With Threshold -------------------------------------------------------------------

#' We expand on this scenario further by limiting stand selection by ownership
#' and threshold2. Any stands that don't meet the criteria are excluded.
run_outputs_3 <- forsys::run(
  return_outputs = TRUE,
  scenario_name = 'test_forest_run3_threshold',
  stand_data = stand_dat,
  stand_id_field = 'stand_id',
  proj_id_field = 'proj_id',
  stand_area_field = 'area_ha',
  # this is the new parameter!
  stand_threshold = 'threshold2 == 1 & ownership == 2',
  scenario_priorities = 'priority1',
  scenario_weighting_values = c('0 5 1'),
  scenario_output_fields = c('area_ha', 'priority1', 'priority2', 'priority3', 'priority4'),
  proj_fixed_target =  TRUE,
  proj_target_field = 'area_ha',
  proj_target_value = 2000
)

test_forest %>%
  select(stand_id, proj_id) %>%
  inner_join(select(run_outputs_3$stand_output, stand_id), by = 'stand_id') %>%
  left_join(select(run_outputs_3$project_output, proj_id, treatment_rank), by = 'proj_id') %>%
  ggplot(aes(fill = 100 - treatment_rank)) +
  geom_sf(color = NA) +
  scale_fill_distiller(palette = 'Spectral') +
  theme_minimal()


## 4 Exploring different project prioritization methods --------------------------

#' Forsys can build projects dynamically using a package called Patchmax,
#' which requires some additional arguments.

library(Patchmax)

# first we need to create an object describing stand adjacency and for gridded data, distance
adj <- Patchmax::calculate_adj(
  Shapefile = test_forest,
  St_id = test_forest$stand_id,
  # TODO: note, originally uses 'nb' but that doesn't work with large dataset
  method = 'buffer')
# TODO: This function takes quite a while to run!
# check inner workings of this function. Does it use actual spatial
# information and many-to-many relationship? Can we simplify this when all
# stands are rasters and use centroid distance?
dist <- Patchmax::calculate_dist(Shapefile = test_forest)

# then in the run functions we set the search distance weight to 10 to expand the search for high objective stands
run_outputs_4 <- forsys::run(
  return_outputs = TRUE,
  stand_data = stand_dat,
  scenario_name = 'test_forest_run4_patchmax',
  stand_id_field = 'stand_id',
  proj_id_field = 'proj_id',
  stand_area_field = 'area_ha',
  stand_threshold = 'threshold2 >= 1',
  scenario_priorities = 'priority2',
  scenario_output_fields = c('area_ha', 'priority1', 'priority2', 'priority3', 'priority4'),
  run_with_patchmax = TRUE,
  patchmax_stnd_adj = adj,
  patchmax_proj_size = 25000,
  patchmax_proj_number = 10,
  patchmax_st_distance = dist,
  patchmax_SDW = 10
)

plot_dat_4 <- run_outputs_4$stand_output %>% mutate(treatment_rank = proj_id)
plot_dat_4 <- test_forest %>% left_join(plot_dat_4 %>% select(stand_id, treatment_rank)) %>%
  group_by(treatment_rank) %>% summarize()
plot(plot_dat_4[,'treatment_rank'], border=NA, main='Patch rank')

Patchmax::calculate_adj
