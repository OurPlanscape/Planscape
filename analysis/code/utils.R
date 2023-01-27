
fit_glmnet <- function(metric, y, df_train, alpha = 0.2, ...) {
  x <- select(df_train, -all_of(metric))
  x <- model.matrix(object = ~ ., data = x)
  glmnet::cv.glmnet(
    x = x,
    y = y,
    type.measure = 'mse',
    alpha = alpha)
}

get_coefficients <- function(model, ...) {
  # finding index of lambda value to use (1se!)
  lambda_index <- which(model$lambda == model$lambda.1se)
  # fetching coefficients
  model$glmnet.fit$beta[,lambda_index]
}

predict_values <- function(model, metric, df_test, ...) {
  x <- select(df_test, -all_of(metric))
  x <- model.matrix(object = ~ ., data = x)
  predict(
    object = model,
    newx = x) %>%
    as.numeric()
}

get_actual_values <- function(df_test, metric, ...) {
  pluck(df_test, metric)
}

calculate_cod <- function(actual, pred, ...) {
  pred %>%
    caret::postResample(actual) %>%
    pluck('Rsquared')
}
