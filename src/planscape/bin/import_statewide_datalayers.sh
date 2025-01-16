#!/usr/bin/env bash

# Stop the script if any command fails
set -e

# Get the directory of the current script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Script directory: $SCRIPT_DIR"

# Set relative paths based on the script's location, 3 levels up to root
PLANSCAPE_CONFIG="$SCRIPT_DIR/../../../.planconfig"
CSV_FILE="$SCRIPT_DIR/layers.csv"

# Log the paths being used
echo "Using PLANSCAPE_CONFIG: $PLANSCAPE_CONFIG"
echo "Using CSV_FILE: $CSV_FILE"

# Check if layers.csv exists
if [[ ! -f "$CSV_FILE" ]]; then
  echo "Error: CSV file not found at $CSV_FILE"
  exit 1
fi

# Process the CSV file
while IFS=',' read -r dataset category input_file layer_name || [ -n "$dataset" ]
do
  # Debug logs for raw input
  echo "Raw line: dataset=$dataset, category=$category, input_file=$input_file, layer_name=$layer_name"

  # Skip header row or empty lines
  if [[ "$dataset" == "dataset" || -z "$dataset" ]]; then
    echo "Skipping header row or empty line."
    continue
  fi

  # Remove any surrounding quotes
  dataset="${dataset//\"/}"
  category="${category//\"/}"
  input_file="${input_file//\"/}"
  layer_name="${layer_name//\"/}"

  # Log the row being processed
  echo "Processing row: dataset=$dataset, category=$category, input_file=$input_file, layer_name=$layer_name"

  # Run the manage.py command
  python manage.py datalayers create \
    --dataset "$dataset" \
    --category "$category" \
    --input-file "$input_file" \
    "$layer_name"

  echo "Finished processing row: $layer_name"

done < <(tail -n +2 "$CSV_FILE") # Skip header row directly

echo "Script completed successfully."
