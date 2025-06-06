DEFAULT_COST_PER_ACRE <- 2470
SHORT_TONS_ACRE_TO_SHORT_TONS_CELL <- 0.2224
MGC_HA_TO_MGC_CELL <- 0.09
PREPROCESSING_MULTIPLIERS <- list(
  total_fuel_exposed_to_fire = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  dead_and_down_fuels = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  standing_dead_and_ladder_fuels = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  available_standing_biomass = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  sawtimber_biomass = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  costs_of_potential_treatment_moving_biomass = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  costs_of_potential_treatment_moving_sawlogs = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  heavy_fuel_load = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  live_tree_density_30in_dbh = SHORT_TONS_ACRE_TO_SHORT_TONS_CELL,
  aboveground_live_tree_carbon = MGC_HA_TO_MGC_CELL
)

STAND_AREAS_ACRES <- list(
  SMALL = 9.884,
  MEDIUM = 98.84,
  LARGE = 494.2
)

CATEGORIES_PER_METRIC <- list(
  potential_total_smoke = c(0.12, 0.25, 0.35),
  american_indian_alaska_native_concentration = seq(0, 8),
  asian_concentration = seq(0, 8),
  black_african_concentration = seq(0, 8),
  damage_potential_wui = seq(0, 5),
  hispanic_black_indigenous_concentration = seq(0, 6),
  hispano_latino_concentration = seq(0, 7),
  low_income_population = seq(0, 9),
  structure_exposure = seq(1, 10),
  structure_exposure_score = seq(1, 10),
  wetland_diversity = seq(1, 8),
  wui_damage_potential = seq(0, 5),
  wildland_urban_interface = seq(0, 2)
)

POSTPROCESSING_FUNCTIONS <- list(
  aboveground_carbon_turnover_time = average_per_stand,
  aboveground_live_tree_carbon = average_per_stand,
  american_indian_alaska_native_concentration = average_and_clamp,
  american_indian_lands = total_acres_per_project,
  american_pacific_marten_habitat = total_acres_per_project,
  annual_burn_probability = average_per_stand,
  aquatic_species_richness = average_per_stand,
  asian_concentration = average_and_clamp,
  available_standing_biomass = total_acres_per_project,
  band_tailed_pigeon_habitat = total_acres_per_project,
  basal_area = average_per_stand,
  black_african_concentration = average_and_clamp,
  california_red_legged_frog = total_acres_per_project,
  california_spotted_owl_habitat = total_acres_per_project,
  california_spotted_owl_territory = total_acres_per_project,
  cavity_nesters_excavators_species_richness = average_per_stand,
  chinook_salmon_critical_habitat = total_acres_per_project,
  coastal_california_gnatcatcher = average_per_stand,
  coho_salmon_critical_habitat = total_acres_per_project,
  cost_of_potential_treatments = average_per_stand,
  damage_potential_wui = average_and_clamp,
  dead_and_down_carbon = average_per_stand,
  dead_and_down_fuels = average_per_stand,
  ember_load_index = average_per_stand,
  endangered_vertebrate = average_per_stand,
  giant_sequoia_stands = total_acres_per_project,
  heavy_fuel_load = average_per_stand,
  hermes_copper_butterfly = total_acres_per_project,
  hispanic_black_indigenous_concentration = average_and_clamp,
  hispano_latino_concentration = average_and_clamp,
  housing_burden_percentile = average_per_stand,
  housing_unit_density = average_per_stand,
  hummingbirds_species_richness = average_per_stand,
  joshua_tree = total_acres_per_project,
  least_bells_virio_habitat = total_acres_per_project,
  live_tree_density_30in_dbh = average_per_stand,
  loggerhead_shrike_habitat = total_acres_per_project,
  low_income_population = average_and_clamp,
  mean_percent_fire_return_interval_departure_condition_class = average_per_stand,
  mountain_lion = total_acres_per_project,
  mountain_yellow_legged_frog = total_acres_per_project,
  nothern_goshawk_habitat = total_acres_per_project,
  nuttails_woodpecker_habitat = total_acres_per_project,
  open_habitat_raptors_species_richness = average_per_stand,
  pacific_fisher = total_acres_per_project,
  percent_impervious_surface = average_per_stand,
  potential_total_smoke = average_and_clamp,
  poverty_percentile = average_per_stand,
  predicted_ignition_probability_human_caused = average_per_stand,
  predicted_ignition_probability_lightning_caused = average_per_stand,
  probability_of_fire_severity_high = average_per_stand,
  probability_of_fire_severity_moderate = average_per_stand,
  ringtail_cat_habitat = total_acres_per_project,
  riparian_habitat = total_acres_per_project,
  sawtimber_biomass = total_acres_per_project,
  standing_dead_and_ladder_fuels = average_per_stand,
  steelhead_critical_habitat = total_acres_per_project,
  structure_exposure = average_and_clamp,
  structure_exposure_score = average_and_clamp,
  threatened_endangered_vertebrate_species_richness = average_per_stand,
  time_since_last_disturbance = average_per_stand,
  total_aboveground_carbon = average_per_stand,
  total_fuel_exposed_to_fire = average_per_stand,
  unemployment_percentile = average_per_stand,
  wetland_diversity = average_and_clamp,
  wildlife_species_richness = average_per_stand,
  wildland_urban_interface = average_and_clamp,
  wui_damage_potential = average_and_clamp
)

METRIC_COLUMNS <- list(
  distance_to_roads = "min",
  # not duplicate, because the legacy name is distance to roads, but the correct is distance from roads
  distance_from_roads = "min",
  slope = "max",
  low_income_population_proportional = "sum",
  wui = "majority",
  mean_percent_fire_return_interval_departure_condition_class = "majority",
  f3veg100 = "majority",
  wildland_urban_interface = "majority"
)

ALLOWED_RESTRICTION_TYPES <- c("POLYGON", "MULTIPOLYGON")
