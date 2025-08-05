## How to run this script?
## From the planscape repo root, do:
## Rscript rscripts/forsys.R --scenario <scenario_id>
## Replace `<scenario_id>` with an integer, corresponding with the scenario id
library("DBI")
library("dplyr")
library("forsys")
library("friendlyeval")
library("glue")
library("import")
library("logger")
library("optparse")
library("purrr")
library("rjson")
library("RPostgreSQL")
library("sf")
library("stringi")
library("stringr")
library("tidyr")
library("uuid")
# do not use spherical geometries
sf_use_s2(FALSE)

readRenviron("../../.env")

import::from("/usr/src/app/src/planscape/rscripts/io_processing.R", .all = TRUE)
import::from("/usr/src/app/src/planscape/rscripts/queries.R", .all = TRUE)
import::from("/usr/src/app/src/planscape/rscripts/constants.R", .all = TRUE)
import::from("/usr/src/app/src/planscape/rscripts/base_forsys.R", .all = TRUE)
import::from("/usr/src/app/src/planscape/rscripts/postprocessing.R", .all = TRUE)

options <- list(
  make_option(
    c("-s", "--scenario",
      type = "character", default = NULL,
      help = "Scenario ID", metavar = "character"
    )
  )
)
parser <- OptionParser(option_list = options)
options <- parse_args(parser)
scenario_id <- options$scenario
if (is.null(scenario_id)) {
  print_help(parser)
  stop("You need to specify one scenario id.")
}

main_v2(scenario_id)
