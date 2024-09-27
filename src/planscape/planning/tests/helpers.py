import os
import json


def _load_geojson_fixture(filename):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    fixture_path = os.path.join(current_dir, "../fixtures", filename)
    with open(fixture_path, "r") as file:
        return json.load(file)
