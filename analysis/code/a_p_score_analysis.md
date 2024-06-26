TCSI Adapt-Protect Score Analysis
================
Laurens Geffert
2022-12-01

<!-- forsys_tcsi_testing.md is generated from forsys_tcsi_testing.Rmd. Please edit that file -->

Load data on Adapt and Protect scores and calculate an aggregation to
speed up the running of the code. Then calculate the Adapt-Protect-score
from the union of the two scores.

``` r
score_adapt <- raster('../data/TCSI/ecosystem/tif/adapt.tif')
score_protect <- raster('../data/TCSI/ecosystem/tif/protect.tif')

score_adapt <- aggregate(score_adapt, fact = 4, fun = mean)
score_protect <- aggregate(score_protect, fact = 4, fun = mean)

# Calculating opportunity score (a.k.a. Adapt-Protect score)
score_rescale <- function(raster1, raster2) {
  max_value <- max(raster1, raster2)
  rescale_factor <- (2 - sqrt(2)) / sqrt(2)
  raster_rescaled <- (2 * max_value + rescale_factor - 1) / (rescale_factor + 1)
  return(raster_rescaled)
}

score_opportunity <- score_rescale(score_adapt, score_protect)
```

Let’s assume that we aim to treat 40% of the landscape. In this thought-
experiment we will try using in turn each of the Adapt score, the
Protect score, and the Adapt-Protect-score for finding the most
important areas to treat. The plots below show the cells we would select
in each case.

``` r
th_adapt <- quantile(score_adapt, .6)
th_protect <- quantile(score_protect, .6)
th_opportunity <- quantile(score_opportunity, .6)

stack(
  score_adapt > th_adapt,
  score_protect > th_protect,
  score_opportunity > th_opportunity) %>%
  set_names(c('adapt', 'protect', 'ap score')) %>%
  plot()
```

<img src="../output/tcsi_a_p_score_analysis_files/tcsi_a_p_score_analysisunnamed-chunk-3-1.png" width="672" />

It looks like there is a lot of overlap. We will calculate what
percentage of cells in the Adapt-Protect-score case is selected because
of their Adapt score and what percentage is selected because of their
Protect score.

``` r
select_adapt <- ((score_opportunity > th_opportunity) & (score_adapt > th_adapt))
select_protect <- ((score_opportunity > th_opportunity) & (score_protect > th_protect))

n_cells_adapt <- select_adapt %>%
  values() %>%
  sum(na.rm = TRUE)
n_cells_protect <- select_protect %>%
  values() %>%
  sum(na.rm = TRUE)

calculate_proportion <- function(n1, n2, digits = 2) {
  {100 * n1 / (n1 + n2)} %>%
  round(digits = digits)
}

stack(
  select_adapt,
  select_protect) %>%
  set_names(c('selected for adapt', 'selected for protect')) %>%
  plot()
```

<img src="../output/tcsi_a_p_score_analysis_files/tcsi_a_p_score_analysisunnamed-chunk-4-1.png" width="672" />

Comparing the areas selected using the Adapt-Protect-score to the areas
selected by **just** Adapt and Protect respectively, we can see that
99.82 percent of cells are selected because of their Adapt score, while
only 0.18 percent of cells are selected because of their Protect score!
