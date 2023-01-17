#' Next steps:
#' - plot histograms for other metrics comparing 1 and -1 for tree density
#' - create pairs plot for metrics to check for correlation
#' - create top decile analysis and look at distribution changes for each metric
#' - look at IV by climate class


library(sf)
library(raster)
library(tidyverse)
library(magrittr)
library(purrr)
library(zeallot)
library(mice)

# Using this raster as the target resolution and extent
default_raster <- raster('../data/TCSI_box/metrics/forest_structure_current_soe.tif')

resample_if_needed <- function(r, default_raster, ...) {
  if (!all(dim(r) == dim(default_raster))) {
    print(paste('resampling raster', names(r)))
    r <- raster::resample(x = r, y = default_raster, 'ngb')
  } else {
    print(paste('no need to resample', names(r)))
  }
  return(r)
}

# load all metrics
df_rasters <- tibble(
  name = c(
    'for_str_td',
    'for_str_ba',
    'for_str_ltd',
    'for_com_se',
    'for_com_sl',
    'for_com_drid',
    'fir_fun_tslf',
    'fir_fun_frid',
    'fad_sev_hsp',
    'bio_foc_cso',
    'bio_div_sr',
    'bio_com_fgr',
    'co2_stb_stb',
    'zzz_zzz_climclass'),
  path = c(
    '../data/TCSI_box/metrics/forest_structure_current_soe.tif',
    '../data/TCSI_box/metrics/baph_current.tif',
    '../data/TCSI_box/metrics/large_tree_current.tif',
    '../data/TCSI_box/metrics/seral_stage_soe_current_early.tif',
    '../data/TCSI_box/metrics/seral_stage_soe_current_late.tif',
    '../data/TCSI_box/metrics/drid_current_soe.tif',
    '../data/TCSI_box/metrics/2A2_CURRENT_Prop_Fire_Dist_FULL.tif',
    '../data/TCSI_box/metrics/frid_current_soe.tif',
    '../data/TCSI_box/metrics/9A1_prob_FLEP4.tif',
    '../data/TCSI_box/metrics/focal_species_current.tif',
    '../data/TCSI_box/metrics/species_richness_current.tif',
    '../data/TCSI_box/metrics/functional_richness_current.tif',
    '../data/TCSI_box/metrics/carbon_current.tif',
    '../data/TCSI_box/ClimateClasses/ClimateClasses.img'))

# resample if resolution or extent do not map
df_rasters %<>%
  mutate(r = path %>%
           map(.f = raster) %>%
           map2(.y = name, .f = ~set_names(.x, .y))) %>%
  mutate(r = map(r, resample_if_needed, default_raster = default_raster))

# convert raster values into dataframe
x <- df_rasters %>%
  pluck('r') %>%
  stack() %>%
  values()

# create a sample that's easier to work with in memory
sierra_metrics <- c('bio_div_sr', 'bio_com_fgr', 'bio_foc_cso', 'zzz_zzz_climclass')
df <- x[sample(nrow(x), size = 1e7, replace = FALSE), ] %>%
  as_tibble() %>%
  # drop all rows that only contain NA for TCSI metrics
  filter(if_any(-one_of(sierra_metrics), ~ !is.na(.))) %>%
  # introducing sampling to speed up the code during dev TODO: take this out
  sample_n(1e4)

# plot a histogram for each metric
df %>%
  pivot_longer(everything()) %>%
  ggplot(aes(x = value)) +
  geom_histogram() +
  facet_wrap(~name, scales = 'free')

#' Next steps:
#' - plot histograms for other metrics comparing 1 and -1 for tree density
#' - create pairs plot for metrics to check for correlation
#' - create top decile analysis and look at distribution changes for each metric
#' - look at IV by climate class


# Find areas with top 10% tree density and bottom 10% tree density,
# then look at histograms for other metrics
td_good <- df$for_str_td %>% quantile(.9, na.rm = TRUE)
td_bad <- df$for_str_td %>% quantile(.1, na.rm = TRUE)

# Drop all cells with mediocre tree density
df_quality_td <- df %>%
  mutate(quality_td = case_when(
    for_str_td >= td_good ~ 'good',
    for_str_td <= td_bad ~ 'bad',
    TRUE ~ NA_character_)) %>%
  filter(!is.na(quality_td))

# plot distribution of other metrics for good and bad tree density cells
df_quality_td %>%
  pivot_longer(-quality_td) %>%
  ggplot(aes(x = value, group = quality_td, fill = quality_td)) +
  geom_density(alpha = .5) +
  facet_wrap(~name, scales = 'free')

# run a kolmogorov-smirnov test to compare the distribution of one other metric
ks_test <- function(df,
                    column_grouping,
                    column_testing) {
  message('\n\nks-testing ', column_testing)
  out <- ks.test(
    x = df %>%
      filter({{ column_grouping }} == 'good') %>%
      pluck(column_testing),
    y = df %>%
      filter({{column_grouping}} == 'bad') %>%
      pluck(column_testing))
  return(out)
}

# run ks-test for each metric
results <- tibble(var_names = colnames(df)[-1]) %>%
  mutate(ks_result = map(
    .x = var_names,
    .f = ~ks_test(df_quality_td, quality_td, .x))) %>%
  mutate(
    ks_D = map_dbl(ks_result, ~.x$statistic),
    ks_p = map_dbl(ks_result, ~.x$p.value))

results %>%
  select(-ks_result) %>%
  arrange(desc(ks_D))


# exclude climate class
df2 <- df %>%
  # convert climate class to factor so it can be used for imputation
  mutate(clim_class = as.factor(zzz_zzz_climclass)) %>%
  select(-zzz_zzz_climclass) %>%
  # drop collinear metric
  select(-fir_fun_frid)

# Drops random fields from metrics data frame. Returns masked data frame and an
# index list with the row + col indices of the values that were dropped
exclude <- c('zzz_zzz_climclass')
drop_random_values <- function(df, p = .1, seed = 42, exclude = 'clim_class') {
  set.seed(seed)
  # drop columns that are excluded from sampling
  excluded <- df[, exclude]
  df <- select(df, -all_of(exclude))
  # sample of random rows with given probability
  sample_mask <- tibble(.rows = nrow(df))
  for (i in colnames(df)) {
    i_mask <- rbinom(nrow(df), 1, p)
    sample_mask <- sample_mask %>%
      {. == 1} %>%
      bind_cols(i_mask) %>%
      set_names(c(colnames(sample_mask), i))
    df[i_mask == 1, i] <- NA
  }
  # sample_size <- nrow(df) * ncol(df) * p
  # sample_rows <- sample(x = 1:nrow(df), size = sample_size, replace = TRUE)
  # sample_cols <- sample(x = 1:ncol(df), size = sample_size, replace = TRUE)
  # # store sample mask for evaluation
  # sample_mask <- sample_rows %>%
  #   map2(.y = sample_cols, .f = c) %>%
  #   unique()
  # for (i in sample_mask) {
  #   df[i[1], i[2]] <- NA
  # }
  df <- bind_cols(df, excluded)
  return(list(df, sample_mask))
}
# drop some random cells
c(df_masked, sample_mask) %<-% drop_random_values(df2, p = .1)
# compare original to masked data
is.na(df_masked) & !is.na(df2)

# specify post-processing logic for mice
# since interpreted values should fall within [-1, 1] range.
# see https://www.gerkovink.com/miceVignettes/Passive_Post_processing/Passive_imputation_post_processing.html for details
ini <- mice(
  data = df_masked,
  maxit = 0)
post_processing <- ini$post
post_processing_logic <- 'imp[[j]][, i] <- squeeze(imp[[j]][, i], c(-1, 1))'
post_processing[1:length(post_processing)-1] <- post_processing_logic

# run actual imputation
imputation <- mice(
  data = df_masked,
  method = 'norm.predict',
  post = post_processing,
  m = 1,
  maxit = 10,
  seed = 42,
  print = FALSE)
df_completed <- imputation %>%
  complete() %>%
  tibble()


# get the predicted and actual values for dropped fields
x <- tibble(
  predicted = df_completed[is.na(df_masked) & !is.na(df2)],
  actual = df2[is.na(df_masked) & !is.na(df2)])
# # restrict values to [-1, 1]
# mutate(predicted = predicted %>%
#          pmin(1, na.rm = TRUE) %>%
#          pmax(-1, na.rm = TRUE))

x <- tibble()
for (i in colnames(df_completed)) {
  if (!i %in% exclude) {
    # find values that were removed
    gaps <- is.na(df_masked[[i]]) & !is.na(df2[[i]])
    x_i <- tibble(
      variable = i,
      predicted = df_completed[[i]][gaps],
      actual = df2[[i]][gaps])
    x <- bind_rows(x, x_i)
  }
}

# check correlation between predicted and actual values
x %>%
  filter(complete.cases(.)) %>%
  select(predicted, actual) %>%
  {cor(.)[[2]]}

# show density plot
x %>%
  ggplot(aes(x = actual, y = predicted)) +
  geom_density2d_filled() +
  facet_wrap(~ variable, scales = 'free')



# change predictor matrix so that only variables we know are linked will be
# used for imputation
ini <- mice(df2, maxit = 0, print = F)
pred <- ini$pred

#write.csv(pred, file = 'analysis/code/predictor_matrix.csv')

