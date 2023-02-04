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

# Data loading -----------------------------------------------------------------

# Using this raster as the target resolution and extent
default_raster <- raster('analysis/data/ACCEL RRK - all layers/airQuality/particulate/PotentialSmokeHighSeverity_2021_300m_base.tif')
# TODO: Get standard extent raster from Nick

resample_if_needed <- function(r, default_raster, silent = TRUE, ...) {
  if (!all(dim(r) == dim(default_raster))) {
    if (!compareCRS(r, default_raster)) {
      message(paste('reprojecting raster', names(r)))
      # climate class layer has coded NA values
      if (names(r) == 'climClass') {
        r[r == 128] <- NA
      }
      r <- projectRaster(from = r, to = default_raster, method = 'ngb')
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
  # TODO: revisit this filter, some may be native 30m
  filter(str_detect(metric, '30m', negate = TRUE)) |>
  # filtering out normalized rasters
  filter(str_detect(metric, '[Nn]ormalized', negate = FALSE)) |>
  # removing socioeconomic metrics
  filter(!metric %in% c(
    'LowIncome_CCI_2021_300m_normalized',
    'UnemploymentPctl_2021_300m_normalized',
    #'DamagePotential_WUI_2022_300m_normalized',
    #'StructureExposureScore_WUI_2022_300m_normalized',
    'HousingBurdenPctl_2021_300m_normalized'
  ))
  # TODO: Should meadows be set to 0 or -1  where NA instead?

# adding climate class
# TODO: Get raw data that went into climate class
metrics <- tibble(
  filename = 'analysis/data/Sierra Nevada ACCEL/ClimateClasses/ClimateClasses.img',
  pillar = 'climClass',
  element = 'climClass',
  folder = 'climClass',
  metric = 'climClass') |>
  bind_rows(metrics)

# adding ACCEL mask
metrics <- tibble(
  filename = 'analysis/data/ACCEL_MASK.tif',
  pillar = 'mask',
  element = 'mask',
  folder = 'mask',
  metric = 'mask') |>
  bind_rows(metrics)

# loading rasters
rasters <- metrics |>
  mutate(r = filename |>
           map(.f = raster) |>
           map2(.y = metric, .f = ~purrr::0set_names(.x, .y))) |>
  mutate(r = map(r, resample_if_needed, default_raster = default_raster))

# persisting data for faster restarting from here
write_rds(rasters, 'analysis/output/rrk_rasters_processed.rds')


# Data processing --------------------------------------------------------------

# converting raster values into dataframe
df <- rasters %>%
  pluck('r') %>%
  stack() %>%
  values() %>%
  as_tibble() %>%
  mutate(climClass = as.factor(climClass)) %>%
  # dropping anything outside of study area
  filter(!is.na(mask))
  
# checking missingness and generate breakdown per variable
df_missingness <- df %>%
  mutate_all(is.na) %>%
  # counting NA cells per metric
  {tibble(
    metric = colnames(.),
    n_na = colSums(.),
    perc_na = colSums(.) / nrow(.) * 100
  )} %>%
  arrange(desc(perc_na))

# drop all rows with NAs
df <- df %>%
  select(
    -mask
    -Meadow_SensNDWI_2019_300m_normalized,
    -DamagePotential_WUI_2022_300m_normalized,
    -StructureExposureScore_WUI_2022_300m_normalized) %>%
  # dropping all rows that are all-NA
  filter(rowSums(!is.na(.)) > 0) %>%
  # dropping all rows without climate class for now
  # TODO: get climate class values for all cells
  filter(!is.na(climClass))

# creating test and validation split
set.seed(42)
data_split <- initial_split(df, prop = 3/4)
df_train <- training(data_split)
df_test  <- testing(data_split)

# plotting a histogram for each metric
df_train %>%
  pivot_longer(-climClass) %>%
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
    # 'LargeTreeCarbon_2021_300m_normalized',
    # 'Normalized_CECS_TotalCarbon_300m',
    # 'AvailableBiomass_2021_300m_normalized',
    # 'BASATOT_2021_300m_normalized',
    # 'Normalized_CECS_TreeToShrubRatio_300m'
    'BASATOT_2021_300m_normalized',
    'TPA_2021_300m_normalized'
  )) %>%
  # self-join data to get pairs of observations
  mutate(row_id = row_number()) %>%
  pivot_longer(cols = -row_id) %>%
  full_join(., ., by = 'row_id') %>%
  # create pair plot
  ggplot( aes(x = value.x, y = value.y)) + 
  geom_point(alpha = .02) +
  geom_smooth(method = 'gam', alpha = .2, color = 'coral') +
  facet_grid(name.x ~ name.y, scales = 'free', switch = 'y') +
  theme_minimal() +
  theme(
    panel.grid = element_blank(),
    axis.text = element_blank(),
    axis.ticks = element_blank(),
    axis.title = element_blank())


# Modelling --------------------------------------------------------------------

# training models for each metric
source('analysis/code/utils.R')

# building models for each metric
# TODO: Re-run this with just a select few predictor variables that are directly impacted / distal factors
predictors <- c(
  'climClass',
  'BASATOT_2021_300m_normalized',
  'TPA_2021_300m_normalized',
  'TPA_30in_up_2021_300m_normalized')
x <- df %>%
  # generating a table with one row per response metric
  select(-climClass, -one_of(predictors)) %>%
  colnames() %>%
  tibble(metric = .) %>%
  # getting training response variable
  mutate(train_y = map(metric, ~pluck(df_train, .x))) %>%
  mutate(train_useable = map2(
    .x = train_y,
    .y = metric,
    .f = find_useable_observations,
    df = df_train,
    predictors = predictors)) %>%
  # getting test response variable
  mutate(test_y = map(metric, ~pluck(df_test, .x))) %>%
  mutate(test_useable = pmap(.,
    find_useable_observations,
    df = df_test,
    response = test_y,
    predictors = predictors)) %>%
  # training a model for each metric
  mutate(model = map2(
    .x = train_useable,
    .y = train_y,
    .f = fit_glmnet,
    df = df_train,
    predictors = predictors)) %>%
  mutate(coeff = pmap(., get_coefficients)) %>%
  # making prediction on test data
  mutate(pred = pmap(.,
    predict_values,
    df = df_test,
    predictors = predictors)) %>%
  mutate(cod = pmap_dbl(., calculate_cod))

# looking and strength of prediction
x %>%
  select(metric, cod) %>%
  arrange(cod)

# extracting coefficients for direct impact variables
x %>%
  select(metric, cod, coeff) %>%
  unnest_wider(coeff) %>%
  select(-starts_with('climClass'), -`(Intercept)`) %>%
  View()


# WIP --------------------------------------------------------------------------




#' # getting coefficients for direct management metrics
#' x <- x %>%
#'   filter(!metric %in% c(
#'     #'BASATOT_2021_300m_normalized',
#'     'TPA_2021_300m_normalized')) %>%
#'   #mutate(coeff_BA = map_dbl(coeff, ~pluck(.x, 'BASATOT_2021_300m_normalized'))) %>%
#'   mutate(coeff_TPA = map_dbl(coeff, ~pluck(.x, 'TPA_2021_300m_normalized')))

# TODO: This assumes all metrics are positive if high.
# Do we want that? Are there some metrics that should be excluded or inverted?
# TODO: Get machine-readable spreadsheet of directionality and association between variables from Nick
df_train <- bind_cols(
  df_train,
  rowSum = df_train %>%
    select(-climClass) %>%
    rowSums())
# showing difference between top cells and all others
# TODO: Do this for top 20 and bottom 20 instead!
# TODO: double-check smoke variable direction
df_train <- df_train %>%
  group_by(climClass) %>%
  mutate(top20 = rowSum >= quantile(rowSum, .8)) %>%
  ungroup()
df_train %>%
  pivot_longer(-one_of('climClass', 'top20')) %>%
  ggplot(aes(x = value, group = top20, fill = top20)) +
  geom_density(alpha = .5) +
  facet_wrap(~name, scales = 'free')

# finding ad-hoc target values for direct management metrics
df_train %>%
  select(BASATOT_2021_300m_normalized, TPA_2021_300m_normalized, top20) %>%
  pivot_longer(-top20) %>%
  ggplot(aes(x = value)) +
  geom_histogram(bins = 30) +
  facet_grid(top20 ~ name)

# "good" areas are .1 higher (-> fewer trees) in Trees Per Acre (TPA)
(df_train %>%
  filter(top20) %>%
  pluck('TPA_2021_300m_normalized') %>%
  mean()) - (df_train %>%
  filter(!top20) %>%
  pluck('TPA_2021_300m_normalized') %>%
  mean())
# "good" areas are .5 higher (-> more area) in total Basal Area!
# TODO: does this mean this would not be a good variable to change directly
# via management, because loss of BA is a side effect of taking out small trees?
(df_train %>%
  filter(top20) %>%
  pluck('BASATOT_2021_300m_normalized') %>%
  mean()) - (df_train %>%
  filter(!top20) %>%
  pluck('BASATOT_2021_300m_normalized') %>%
  mean())
# "good" areas are .4 higher (-> more carbon)
(df_train %>%
  filter(top20) %>%
  pluck('Normalized_CECS_TotalCarbon_300m') %>%
  mean()) - (df_train %>%
  filter(!top20) %>%
  pluck('Normalized_CECS_TotalCarbon_300m') %>%
  mean())

target_TPA <- df_train %>%
  filter(top20) %>%
  pluck('TPA_2021_300m_normalized') %>%
  mean()

df_train <- df_train %>% select(-rowSum, -top20)
df_treat <- df_train %>%
  # setting new hypothetical value after treatment
  mutate(TPA_2021_300m_normalized = pmin(
    TPA_2021_300m_normalized, target_TPA))

# predicting other metrics as result
df_new_conditions <- map2_dfc(
  .x = x$model,
  .y = x$metric,
  .f = predict_values,
  df = df_treat
) 

df_new_conditions %>%
  bind_cols(climClass = df_train$climClass) %>%
  select(colnames(df_train)) %>%
  {summary(. - df_train)}




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

metrics_direct_impact <- c(
  # 'AvailableBiomass_2021_300m_normalized', 'tree_biomass', -1
  # 'Normalized_CECS_TreeToShrubRatio_300m', 'tree_dominance', 1,
  # 'proportion_of_SDI_83_Max_normalized_300m', 'stand_density_index', -1,
  'BASATOT_2021_300m_normalized', 'total_basal_area', -1,
  'TPA_2021_300m_normalized', 'trees_per_acre', 1
)

df_train %>%
  select(BASATOT_2021_300m_normalized, TPA_2021_300m_normalized) %>%
  ggplot(aes(x = BASATOT_2021_300m_normalized, y = TPA_2021_300m_normalized)) +
  geom_point(alpha = .2) +
  geom_smooth(method = 'gam', alpha = .2, color = 'coral')

df_train %>%
  select(TPA_2021_300m_normalized) %>%
  ggplot(aes(x = TPA_2021_300m_normalized)) +
  geom_histogram()

log_no_nans <- function(x) {
  log(x - min(x) + 1)
}

log_no_nans(df_train$BASATOT_2021_300m_normalized)

# TODO:
# get continuous climatic variables instead of climClass
# get data on directionality and target values of metrics
# make prediction for treated areas
# (on hold) create true spatial holdout for testing

# can we use a sum of metric values for each cell to find the "best" cells?


# Historic management ----------------------------------------------------------

# Require a raster that has NA for cells outside of planning region
region <- rasters$r[[1]]
region[region == 128] <- NA
region[region != 128] <- 0

# # Loading historic management for all years
# management <- tibble(
#   filename = 'analysis/data/Management/' %>%
#     fs::dir_ls() %>%
#     str_subset('.tif$')) %>%
#   mutate(
#     year = str_extract(filename, '(?<=\\_)\\d\\d\\d\\d(?=\\.tif)'),
#     r = filename |>
#       map(.f = raster) |>
#       map2(.y = year, .f = ~set_names(.x, .y)) %>%
#       map(resample_if_needed, default_raster = region))
# 
# write_rds(management, 'output/management_rasters.rds')
management <- read_rds('output/management_rasters.rds')

management_r <- management %>%
  pluck('r') %>%
  stack()

management_r[management_r > 0] <- 1
plot(management_r[[1]])

m_2019 <- raster('analysis/data/Management/mgmt_2019.tif')

m_2019[]

# TODO: reach out to Rasmi about this analysis
# TODO: forward Mike's email to Jon, Elsie, Wendy, Min Su