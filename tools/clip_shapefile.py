# Tool to clip a shapefile to California
import geopandas as gpd
from shapely.geometry import Polygon

ORIGINAL_FILE="~/Downloads/S_USA.AdministrativeForest/S_USA.AdministrativeForest.shp"
CALIFORNIA_BOUNDARY="~/cnra/env/Planscape/data/boundary/ca-state-boundary/CA_State_TIGER2016.shp"
CLIPPED_OUTPUT_FILE="~/cnra/env/Planscape/data/boundary/California_USFS/California_USFS.shp"

# Load the original and California boundary files
original:gpd.GeoDataFrame = gpd.read_file(ORIGINAL_FILE)
california:gpd.GeoDataFrame = gpd.read_file(CALIFORNIA_BOUNDARY)

# Modify the CRS of the California shapefile to match the input
modified_california = california.to_crs(original.crs) 

# Save clipped shapefile
clipped_shp = gpd.clip(original, modified_california)
clipped_shp.to_file(CLIPPED_OUTPUT_FILE, driver="ESRI Shapefile")