packages <- c(
  "dplyr",
  "textshaping",
  "stringi",
  "ggnewscale",
  "udunits2",
  "sf",
  "ragg",
  "pkgdown",
  "devtools",
  "DBI",
  "RPostgreSQL",
  "optparse",
  "rjson",
  "glue",
  "purrr",
  "logger",
)

install.packages(packages)

library("devtools")

devtools::install_github("forsys-sp/forsysr")
devtools::install_github("forsys-sp/patchmax")
devtools::install_github("milesmcbain/friendlyeval")
