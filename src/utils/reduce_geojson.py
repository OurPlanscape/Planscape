import argparse
import json

## Example usage:
## python3 reduce_geojson.py <path_to_input_geojson_file> <path_to_output_geojson_file> --decimal_places 5

# Initialize parser
parser = argparse.ArgumentParser()

# Add arguments
parser.add_argument('infile')
parser.add_argument('outfile')
parser.add_argument('--decimal_places', nargs='?', const=5, type=int)

# Parse arguments
args = parser.parse_args()
print(args)
with open(args.infile, 'r') as f:
  data = json.load(f)

# Go through all coordinates in the geojson and trim decimals to X places
def trimCoordinates(coord):
    if (len(coord) != 2 or not isinstance(coord[0], float)):
        for coords in coord:
            trimCoordinates(coords)
        return
    assert(len(coord) == 2 and isinstance(coord[0], float))
    coord[0] = round(coord[0], args.decimal_places)
    coord[1] = round(coord[1], args.decimal_places)

for feature in data['features']:
    coords = feature['geometry']['coordinates']
    trimCoordinates(coords)

# Save to output file
with open(args.outfile, 'w') as json_file:
  json.dump(data, json_file)