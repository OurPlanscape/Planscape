#!/usr/bin/env bash
set -euo pipefail

cd "/media/george/vaa-linux/projects/Planscape/src/planscape"

DATASET_ID="1063"
RASTER_DIR="${RASTER_DIR:-/media/george/vaa-linux/planscape/for-reports}"
PYTHON_BIN=(${PYTHON_BIN:-uv run python})
MAP_SERVICE_TYPE="${MAP_SERVICE_TYPE:-COG}"
AET_BASELINE_METADATA='{"modules":{"funding_report":{"variable":"AET","role":"baseline"}}}'
AET_TARGET_METADATA='{"modules":{"funding_report":{"variable":"AET","role":"target"}}}'
AET_DELTA_METADATA='{"modules":{"funding_report":{"variable":"AET","role":"delta"}}}'
TREATMENT_METADATA='{"modules":{"funding_report":{"variable":"TREATMENT","role":"treatment"}}}'
BIOMASS_MERCH_METADATA='{"modules":{"funding_report":{"variable":"BIOMASS","role":"merchantable"}}}'
BIOMASS_TOTAL_METADATA='{"modules":{"funding_report":{"variable":"BIOMASS","role":"total"}}}'
BIOMASS_WOOD_TYPE_METADATA='{"modules":{"funding_report":{"variable":"BIOMASS","role":"wood_type"}}}'

# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2026 aboveground_total_live" --input-file "$RASTER_DIR/Baseline_2026_aboveground_total_live.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2026 pot_smoke_sev" --input-file "$RASTER_DIR/Baseline_2026_pot_smoke_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2026 tot_flame_sev" --input-file "$RASTER_DIR/Baseline_2026_tot_flame_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2031 aboveground_total_live" --input-file "$RASTER_DIR/Baseline_2031_aboveground_total_live.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2031 pot_smoke_sev" --input-file "$RASTER_DIR/Baseline_2031_pot_smoke_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2031 tot_flame_sev" --input-file "$RASTER_DIR/Baseline_2031_tot_flame_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2036 aboveground_total_live" --input-file "$RASTER_DIR/Baseline_2036_aboveground_total_live.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2036 pot_smoke_sev" --input-file "$RASTER_DIR/Baseline_2036_pot_smoke_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2036 tot_flame_sev" --input-file "$RASTER_DIR/Baseline_2036_tot_flame_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2041 aboveground_total_live" --input-file "$RASTER_DIR/Baseline_2041_aboveground_total_live.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2041 pot_smoke_sev" --input-file "$RASTER_DIR/Baseline_2041_pot_smoke_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2041 tot_flame_sev" --input-file "$RASTER_DIR/Baseline_2041_tot_flame_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2046 aboveground_total_live" --input-file "$RASTER_DIR/Baseline_2046_aboveground_total_live.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2046 pot_smoke_sev" --input-file "$RASTER_DIR/Baseline_2046_pot_smoke_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Baseline 2046 tot_flame_sev" --input-file "$RASTER_DIR/Baseline_2046_tot_flame_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2026 aboveground_total_live" --input-file "$RASTER_DIR/Legalmax_2026_aboveground_total_live.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2026 pot_smoke_sev" --input-file "$RASTER_DIR/Legalmax_2026_pot_smoke_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2026 tot_flame_sev" --input-file "$RASTER_DIR/Legalmax_2026_tot_flame_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2031 aboveground_total_live" --input-file "$RASTER_DIR/Legalmax_2031_aboveground_total_live.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2031 pot_smoke_sev" --input-file "$RASTER_DIR/Legalmax_2031_pot_smoke_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2031 tot_flame_sev" --input-file "$RASTER_DIR/Legalmax_2031_tot_flame_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2036 aboveground_total_live" --input-file "$RASTER_DIR/Legalmax_2036_aboveground_total_live.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2036 pot_smoke_sev" --input-file "$RASTER_DIR/Legalmax_2036_pot_smoke_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2036 tot_flame_sev" --input-file "$RASTER_DIR/Legalmax_2036_tot_flame_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2041 aboveground_total_live" --input-file "$RASTER_DIR/Legalmax_2041_aboveground_total_live.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2041 pot_smoke_sev" --input-file "$RASTER_DIR/Legalmax_2041_pot_smoke_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2041 tot_flame_sev" --input-file "$RASTER_DIR/Legalmax_2041_tot_flame_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2046 aboveground_total_live" --input-file "$RASTER_DIR/Legalmax_2046_aboveground_total_live.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2046 pot_smoke_sev" --input-file "$RASTER_DIR/Legalmax_2046_pot_smoke_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "Legalmax 2046 tot_flame_sev" --input-file "$RASTER_DIR/Legalmax_2046_tot_flame_sev.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --funding
# "${PYTHON_BIN[@]}" manage.py datalayers create "AET baseline" --input-file "$RASTER_DIR/AET_baseline_fvsmasked.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --metadata "$AET_BASELINE_METADATA"
# "${PYTHON_BIN[@]}" manage.py datalayers create "AET target" --input-file "$RASTER_DIR/AET_legalmax_fvsmasked.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --metadata "$AET_TARGET_METADATA"
# "${PYTHON_BIN[@]}" manage.py datalayers create "AET delta" --input-file "$RASTER_DIR/AET_legalmax_difference_fvsmasked.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --metadata "$AET_DELTA_METADATA"
# TREATMENT_STYLE_DATA='{"map_type":"VALUES","no_data":{"values":["nodata"],"color":null,"opacity":0,"label":"No Treatment"},"entries":[{"value":1,"color":"#ff0000","opacity":1.0,"label":"Rx Burn"},{"value":2,"color":"#00ff00","opacity":1.0,"label":"Thin and Rx Burn"}]}'
# TREATMENT_STYLE_OUTPUT=$("${PYTHON_BIN[@]}" manage.py styles create "Funding Report Treatments" RASTER --data "$TREATMENT_STYLE_DATA")
# TREATMENT_STYLE_ID=$(echo "$TREATMENT_STYLE_OUTPUT" | sed -E 's/\x1b\[[0-9;]*m//g' | grep -oE "'id': [0-9]+" | head -n 1 | grep -oE '[0-9]+')

"${PYTHON_BIN[@]}" manage.py datalayers create "Treatments" --input-file "$RASTER_DIR/treatments.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --metadata "$TREATMENT_METADATA"
# "${PYTHON_BIN[@]}" manage.py datalayers create "Biomass Merchantable" --input-file "$RASTER_DIR/merchantable_biomass.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --metadata "$BIOMASS_MERCH_METADATA"
# "${PYTHON_BIN[@]}" manage.py datalayers create "Biomass Total" --input-file "$RASTER_DIR/total_biomass.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --metadata "$BIOMASS_TOTAL_METADATA"
# "${PYTHON_BIN[@]}" manage.py datalayers create "Biomass Wood Type" --input-file "$RASTER_DIR/wood_type.tif" --dataset "$DATASET_ID" --map-service-type "$MAP_SERVICE_TYPE" --metadata "$BIOMASS_WOOD_TYPE_METADATA"
