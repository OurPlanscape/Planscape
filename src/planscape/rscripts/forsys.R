## How to run this script?
## From the planscape repo root, do:
## Rscript rscripts/forsys.R --scenario <scenario_id>
## Replace `<scenario_id>` with an integer, corresponding with the scenario id
library("sf")
library("optparse")

# do not use spherical geometries
sf_use_s2(FALSE)
readRenviron("../../.env")
source("./rscripts/base_forsys.R")

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


main(scenario_id)
