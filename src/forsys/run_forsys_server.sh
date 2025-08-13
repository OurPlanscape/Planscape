#!/bin/bash

Rscript --vanilla -e "library(plumber); plumb('server.R') %>% pr_run(host='0.0.0.0', port=$1)"

exit 0
