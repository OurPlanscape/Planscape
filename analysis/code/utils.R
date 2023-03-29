
find_useable_observations <- function(response, metric, df, predictors, ...) {
  # restricting input data to named predictors
  x <- select(df, one_of(predictors))
  # dropping response variable if present in predictors
  if (metric %in% colnames(x)) {
    x <- select(x, -all_of(metric))
  }
  # removing all incomplete cases
  useable_observations <- complete.cases(x) & complete.cases(response)
  return(useable_observations)
}

fit_glmnet <- function(useable, response, df, predictors, alpha = 0.0, ...) {
  # preprocessing data to limit columns and rows to valid ones
  x <- df[useable, predictors]
  response <- response[useable]
  # fitting actual model
  x <- model.matrix(object = ~ ., data = x)
  message('training with ', nrow(x), ' observations')
  model <- glmnet::cv.glmnet(
    x = x,
    y = response,
    type.measure = 'mse',
    alpha = alpha)
  return(model)
}

get_coefficients <- function(model, ...) {
  # finding index of lambda value to use (1se!)
  lambda_index <- which(model$lambda == model$lambda.1se)
  # fetching coefficients
  model$glmnet.fit$beta[,lambda_index]
}

predict_values <- function(df, model, metric, predictors, test_useable, ...) {
  # preprocessing data to limit columns and rows to valid ones
  x <- df %>%
    select(one_of(predictors)) %>%
    filter(test_useable)
  x <- model.matrix(object = ~ ., data = x)
  message('predicting for ', nrow(x), ' observations')
  prediction <- predict(
    object = model,
    newx = x) %>%
    as.numeric()
  prediction <- setNames(tibble(prediction), metric)
  return(prediction)
}

calculate_cod <- function(test_useable, test_y, pred, ...) {
  cod <- caret::postResample(
    pred = pred,
    obs = test_y[test_useable]) %>%
    pluck('Rsquared')
  return(cod)
}

# Adjusting top and bottom percentiles in the data
remove_outliers <- function(x, percentiles = .01) {
  thresholds <- quantile(x, probs = c(.01, 1-.01), na.rm = TRUE)
  x[x < thresholds[[1]]] <- thresholds[[1]]
  x[x > thresholds[[2]]] <- thresholds[[2]]
  return(x)
}

normalize_values <- function(x) {
  ((x + min(x, na.rm = TRUE)) / max(x, na.rm = TRUE)) * 2 - 1
}

# Calculating opportunity score (a.k.a. Adapt-Protect score)
score_rescale <- function(raster1, raster2) {
  max_value <- max(raster1, raster2)
  rescale_factor <- (2 - sqrt(2)) / sqrt(2)
  raster_rescaled <- (2 * max_value + rescale_factor - 1) / (rescale_factor + 1)
  return(raster_rescaled)
}