
fit_glmnet <- function(metric, y, df_train, alpha = 0.2, ...) {
  glmnet::cv.glmnet(
    x = df_train %>%
      select(-all_of(metric)) %>%
      #as.matrix(),
      mutate(climClass = as.factor(climClass)) %>%
      model.matrix( ~ .-1, df_train),
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
  predict(
    object = model,
    newx = df_test %>%
      select(-all_of(metric)) %>%
      as.matrix()) %>%
    as.numeric()
}

get_actual_values <- function(df_test, metric, ...) {
  pluck(df_test, metric)
}

calculate_cod <- function(actual, pred, ...) {
  caret::postResample(actual, pred)
}
