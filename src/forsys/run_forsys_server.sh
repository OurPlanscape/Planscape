#!/bin/bash

Rscript --vanilla -e "library(plumber); pr('server.R') %>% pr_run(port=$1)"

exit 0
