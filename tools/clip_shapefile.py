import geopandas as gpd
from shapely.geometry import Polygon

original:gpd.GeoDataFrame = gpd.read_file("~/Downloads/S_USA.AdministrativeForest/S_USA.AdministrativeForest.shp")

california:gpd.GeoDataFrame = gpd.read_file("~/cnra/env/Planscape/data/boundary/ca-state-boundary/CA_State_TIGER2016.shp")

# Modify the CRS of the California shapefile to match the input
modified_california = california.to_crs(original.crs) 

# Save clipped shapefile
clipped_shp = gpd.clip(original, modified_california)
clipped_shp.to_file("~/cnra/env/Planscape/data/boundary/California_USFS/California_USFS.shp", driver="ESRI Shapefile")