import json

from pathlib import Path
from decouple import config
from django.contrib.gis.utils.layermapping import LayerMapping
from .models import TCSI_HUC12


tcsi_huc12_mapping = {
    'objectid': 'OBJECTID',
    'tnmid': 'TNMID',
    'metasource': 'MetaSource',
    'sourcedata': 'SourceData',
    'sourceorig': 'SourceOrig',
    'sourcefeat': 'SourceFeat',
    'loaddate': 'LoadDate',
    'noncontrib': 'NonContrib',
    'noncontr_1': 'NonContr_1',
    'areasqkm': 'AreaSqKm',
    'areaacres': 'AreaAcres',
    'gnis_id': 'GNIS_ID',
    'name': 'Name',
    'states': 'States',
    'huc12': 'HUC12',
    'hutype': 'HUType',
    'humod': 'HUMod',
    'tohuc': 'ToHUC',
    'shape_leng': 'Shape_Leng',
    'shape_area': 'Shape_Area',
    'hectares': 'Hectares',
    'geom': 'MULTIPOLYGON',
}

TCSI_HUC12_shp = config('TCSI_HUC12_shp_FILEPATH')

def run(verbose=True):
    # NB: 3310 is the California coordinate system https://epsg.io/3310
    lm = LayerMapping(TCSI_HUC12, TCSI_HUC12_shp, tcsi_huc12_mapping, source_srs=3310, transform=True)
    lm.save(strict=True, verbose=verbose)
