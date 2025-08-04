#!/bin/bash

Rscript --vanilla -e "library(plumber); plumb('/usr/src/app/src/forsys/server.R') %>% pr_run(host='0.0.0.0', port=$1)"

exit 0
