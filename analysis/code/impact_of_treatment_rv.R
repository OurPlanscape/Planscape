library(sf)
library(fs)
library(raster)
library(tidyverse)
library(tidymodels)
library(magrittr)
library(purrr)
library(zeallot)
library(mice)
library(corrr)

# Using this raster as the target resolution and extent
default_raster <- raster('analysis/data/ACCEL RRK - all layers/airQuality/particulate/PotentialSmokeHighSeverity_2021_300m_base.tif')

resample_if_needed <- function(r, default_raster, silent = TRUE, ...) {
  if (!all(dim(r) == dim(default_raster))) {
    if (!compareCRS(r, default_raster)) {
      message(paste('reprojecting raster', names(r)))
      r <- projectRaster(from = r, to = default_raster)
    }
    message(paste('resampling raster', names(r)))
    r <- raster::resample(x = r, y = default_raster, 'ngb')
  } else {
    if (!silent) message(paste('no need to resample', names(r)))
  }
  return(r)
}

# getting file paths of all metrics
metrics <- tibble(
  filename = 'analysis/data/ACCEL RRK - all layers/' |>
    dir_ls(recurse = TRUE) |>
    str_subset('(\\.tif$)|(\\.img$)'))

# getting name hierarchy
metrics <- metrics |>
  mutate(
    subfolder = str_extract(
      string = filename,
      pattern = '(?<=analysis\\/data\\/ACCEL RRK - all layers\\/).+(?=(\\.tif$)|(\\.img$))')) |>
  separate(
    col = subfolder,
    into = c('pillar', 'element', 'folder', 'metric'),
    sep = '/',
    fill = 'left') |>
  mutate(
    folder = coalesce(folder, metric),
    element = coalesce(element, folder),
    pillar = coalesce(pillar, element)) |>
  # filtering out 30m rasters
  filter(str_detect(metric, '_30m_', negate = TRUE)) |>
  # a few layers aren't named consistently
filter(!metric %in% c(
  'Mortality_MMI_2017_2021_normalized_5climateClass30m',
  'CA_Black_Oak_Stand_Distribution_2016to2020',
  'ACCEL_habitatConnectivity_valuesInt',
  'DamagePotential_WUI_2022',
  'StructureExposureScore_WUI_2022',
  'Mortality_MMI_2017_2021_compressed'
)) |>
  # some layers are spatially restriced and thus introduce NAs to the data
  # TODO: Should these be set to 0 where NA instead?
  filter(!metric %in% c(
    'DamagePotential_WUI_2022_300m_base',
    'StructureExposureScore_WUI_2022_300m_base',
    'Meadow_SensNDWI_2019_300m_base'
  )) |>
  # filtering out normalized rasters
  filter(str_detect(metric, '_normalized$', negate = TRUE))

# adding climate class
metrics <- tibble(
  filename = 'analysis/data/Sierra Nevada ACCEL/ClimateClasses/ClimateClasses.img',
  pillar = 'climClass',
  element = 'climClass',
  folder = 'climClass',
  metric = 'climClass') |>
  bind_rows(metrics)

# loading rasters
rasters <- metrics |>
  mutate(r = filename |>
           map(.f = raster) |>
           map2(.y = metric, .f = ~set_names(.x, .y))) |>
  mutate(r = map(r, resample_if_needed, default_raster = default_raster))

# convert raster values into dataframe
df <- rasters %>%
  pluck('r') %>%
  stack() %>%
  values() %>%
  as_tibble() %>%
  filter(complete.cases(.))

# # drop rows that are all-NA
# df <- df[rowSums(!is.na(df)) > 0, ]

# creating test and validation split
set.seed(42)
data_split <- initial_split(df, prop = 3/4)
df_train <- training(data_split)
df_test  <- testing(data_split)

# plotting a histogram for each metric
df_train %>%
  pivot_longer(everything()) %>%
  filter(complete.cases(.)) %>%
  ggplot(aes(x = value)) +
  geom_histogram(bins = 30) +
  facet_wrap(~name, scales = 'free')

# showing correlations between variables
df_train %>%
  correlate() %>%
  rplot()

# investigate correlations between metrics with a pair plot collection
df_train %>%
  sample_n(1e4) %>%
  select(one_of(
    'LargeTreeCarbon_2021_300m_base',
    #'CECS_TotalCarbon_300m',
    'Normalized_CECS_TotalCarbon_300m',
    'AvailableBiomass_2021_300m_base',
    'BASATOT_2021_300m_base',
    #'CECS_TreeToShrubRatio_Pct_300m',
    'Normalized_CECS_TreeToShrubRatio_300m'
  )) %>%
  #mutate_all(log) %>%
  # self-join data to get pairs of observations
  mutate(row_id = row_number()) %>%
  pivot_longer(cols = -row_id) %>%
  full_join(., ., by = 'row_id') %>%
  # create pair plot
  ggplot( aes(x = value.x, y = value.y)) + 
  #geom_density2d_filled() +
  #scale_fill_viridis_d() +
  geom_point(alpha = .02) +
  geom_smooth(method = 'gam', alpha = .2, color = 'coral') +
  facet_grid(name.x ~ name.y, scales = 'free', switch = 'y') +
  theme_minimal() +
  theme(
    panel.grid = element_blank(),
    axis.text = element_blank(),
    axis.ticks = element_blank(),
    axis.title = element_blank())

# training models for each metric
source('analysis/code/utils.R')
x <- tibble(metric = colnames(df)) %>%
  #filter(row_number() %in% c(1,2)) %>%
  mutate(y = map(metric, ~pluck(df_train, .x))) %>%
  mutate(model = pmap(., fit_glmnet, df_train = df_train)) %>%
  mutate(coeff = pmap(., get_coefficients)) %>%
  mutate(pred = pmap(., predict_values, df_test = df_test)) %>%
  mutate(actual = pmap(., get_actual_values, df_test = df_test)) %>%
  mutate(cod = pmap_dbl(., calculate_cod))

find_coeffs_treatment <- function(coeffs) {
  coeffs_modified <- names(coeffs) %in% c(
    'LargeTreeCarbon_2021_300m_base',
    'CECS_TotalCarbon_300m',
    'Normalized_CECS_TotalCarbon_300m',
    'AvailableBiomass_2021_300m_base',
    'CECS_TreeToShrubRatio_Pct_300m',
    'Normalized_CECS_TreeToShrubRatio_300m',
    'proportion_of_SDI_83_Max_300m',
    'proportion_of_SDI_83_Max_normalized_300m',
    'BASATOT_2021_300m_base',
    'TPA_2021_300m_base',
    'TPA_30in_up_2021_300m_base')
  coeffs_nonnull <- coeffs != .0
  coeffs[coeffs_modified & coeffs_nonnull]
}

# TODO:
# get continuous climatic variables instead of climClass
# get data on directionality and target values of metrics
# make prediction for treated areas

