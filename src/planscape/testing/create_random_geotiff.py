import rasterio
import rasterio.transform
import numpy as np
from planscape.settings import CRS_9822_PROJ4

arr = np.random.rand(10, 10) * 100

OUTPUT_FILE = 'testdata/random_test.tif'

with rasterio.open(
    OUTPUT_FILE,
    'w',
    driver='GTiff',
    height=arr.shape[0],
    width=arr.shape[1],
    count=1,
    dtype=arr.dtype,
    crs=rasterio.CRS.from_proj4(CRS_9822_PROJ4),
    nodata=0,
    transform=rasterio.transform.from_origin(-1553663.812, 2544603.833, 300, 300)
) as dst:
    dst.write(arr, 1)
