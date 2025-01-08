#!/usr/bin/env bash

# Stop the script if any command fails
set -e

# Log the current working directory
echo "Current directory: $(pwd)"

# Absolute path to .planconfig
export PLANSCAPE_CONFIG="/usr/src/app/.planconfig"
echo "Using PLANSCAPE_CONFIG: $PLANSCAPE_CONFIG"

# Absolute path to CSV file
CSV_FILE="/usr/src/app/src/planscape/bin/layers.csv"
echo "Using CSV_FILE: $CSV_FILE"

# Check if .planconfig exists
if [[ ! -f "$PLANSCAPE_CONFIG" ]]; then
  echo "Error: .planconfig file not found at $PLANSCAPE_CONFIG"
  exit 1
fi

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
