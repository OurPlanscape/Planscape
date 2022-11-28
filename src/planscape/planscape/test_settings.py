from planscape.settings import *

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# $ psql -d planscape
#  planscape=# ALTER USER planscape CREATEDB;
# SET postgis.enable_outdb_rasters = True;
# psql SET postgis.gdal_enabled_drivers = 'GTiff JPEG PNG';
# psql template1 -c "CREATE EXTENSION postgis;"
# psql template1 -c "CREATE EXTENSION postgis_raster;"
# pip install gdal
