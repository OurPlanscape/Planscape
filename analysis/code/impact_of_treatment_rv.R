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
  filter(str_detect(metric, '30m', negate = TRUE)) |>
  # filtering out normalized rasters
  filter(str_detect(metric, '[Nn]ormalized', negate = FALSE)) |>
  # # a few layers aren't named consistently
  # filter(!metric %in% c(
  #   'Mortality_MMI_2017_2021_normalized_5climateClass30m',
  #   'CA_Black_Oak_Stand_Distribution_2016to2020',
  #   'ACCEL_habitatConnectivity_valuesInt',
  #   'DamagePotential_WUI_2022',
  #   'StructureExposureScore_WUI_2022',
  #   'Mortality_MMI_2017_2021_compressed'
  # )) |>
  # some layers are spatially restriced and thus introduce NAs to the data
  # TODO: Should these be set to 0 where NA instead?
  filter(!metric %in% c(
    'LowIncome_CCI_2021_300m_normalized',
    'UnemploymentPctl_2021_300m_normalized',
    'DamagePotential_WUI_2022_300m_normalized',
    'StructureExposureScore_WUI_2022_300m_normalized',
    'Meadow_SensNDWI_2019_300m_normalized',
    'HousingBurdenPctl_2021_300m_normalized'
  ))

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
  mutate(climClass = as.factor(climClass))
# check missingness
colSums(is.na(df))
# drop all rows with NAs
df <- filter(df, complete.cases(df))

# # drop rows that are all-NA
# df <- df[rowSums(!is.na(df)) > 0, ]

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
#metrics_meta <- read_csv('analysis/code/metrics.csv')

# building models for each metric
x <- tibble(metric = df %>% select(-climClass) %>% colnames()) %>%
  mutate(y = map(metric, ~pluck(df_train, .x))) %>%
  mutate(model = pmap(., fit_glmnet, df_train = df_train)) %>%
  mutate(coeff = pmap(., get_coefficients)) %>%
  mutate(pred = pmap(., predict_values, df_test = df_test)) %>%
  mutate(actual = pmap(., get_actual_values, df_test = df_test)) %>%
  mutate(cod = pmap_dbl(., calculate_cod))

# getting coefficients for direct management metrics
x <- x %>%
  filter(!metric %in% c(
    'BASATOT_2021_300m_normalized',
    'TPA_2021_300m_normalized')) %>%
  mutate(coeff_BA = map_dbl(coeff, ~pluck(.x, 'BASATOT_2021_300m_normalized'))) %>%
  mutate(coeff_TPA = map_dbl(coeff, ~pluck(.x, 'TPA_2021_300m_normalized')))

# TODO: This assumes all metrics are positive if high.
# Do we want that? Are there some metrics that should be excluded or inverted?
df_train <- bind_cols(
  df_train,
  rowSum = df_train %>%
    select(-climClass) %>%
    rowSums())
# showing difference between top cells and all others
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
