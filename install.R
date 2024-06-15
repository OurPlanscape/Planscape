repos <- "http://cran.us.r-project.org"
if (!require("remotes")) install.packages("remotes", repos=repos)
if (!require("pacman")) install.packages("pacman", repos=repos)
library(remotes)
library(pacman)
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
  "MilesMcBain/friendlyeval"
)

pacman::p_load(packages, character.only=TRUE)

if (!require("forsys")) {
  # pacman is throwing errors to install from github :/
  remotes::install_github("forsys-sp/forsysr")
  remotes::install_github("forsys-sp/patchmax")
}

print("INSTALLATION DONE")