repos <- "http://cran.us.r-project.org"
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
  "RPostgres",
  "optparse",
  "rjson",
  "glue",
  "purrr",
  "logger",
  "tidyr",
  "checkmate",
  "uuid"
)

github_packages <- c(
  "forsys-sp/forsysr",
  "forsys-sp/patchmax",
  "milesmcbain/friendlyeval"
)

if (!require("pacman")) install.packages("pacman", repos=repos)
pacman::p_load(packages)
pacman::p_load_gh(github_packages)