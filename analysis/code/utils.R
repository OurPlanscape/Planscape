
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

fit_glmnet <- function(useable, response, df, predictors, alpha = 0.2, ...) {
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
