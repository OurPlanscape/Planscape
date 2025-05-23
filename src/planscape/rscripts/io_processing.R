average_per_stand <- function(value, stand_count, stand_size = NA, metric = NA) {
  return(round(value / stand_count, digits = 2))
}

average_and_clamp <- function(value, stand_count, stand_size = NA, metric = NA) {
  categories <- CATEGORIES_PER_METRIC[[metric]]
  average <- value / stand_count
  result <- abs(categories - average) %>%
    which.min() %>%
    categories[.]
  return(result)
}

total_acres_per_project <- function(value, stand_count, stand_size, metric = NA) {
  stand_size_in_acres <- STAND_AREAS_ACRES[[stand_size]]
  return(round(value * stand_size_in_acres, digits = 2))
}