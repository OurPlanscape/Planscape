import config.pillar_config as config
import matplotlib.pyplot as plt
from decouple import config
from django.contrib.gis.gdal.raster.source import GDALRaster

from base.condition_types import ConditionScoreType
import eval.compute_conditions as cc

configuration = config.PillarConfig("Planscape/src/config/metrics.json")
metric = configuration.get_metric("tcsi", "forest_resilience", "forest_structure", "structural_heterogeneity")
if metric is not None:
    print(metric.get('current_conditions_only', False))


thumbnail = cc.average_weighted_scores(configuration,
                                    cc.ConditionReader(),
                                    {
                                        'tcsi/forest_resilience': 0.2,
                                        'tcsi/fire_adapted_communities': 0.8,
                                    },
                                    ConditionScoreType.CURRENT, recompute=False)
print('array type: ', type(thumbnail))
print(thumbnail)

 
rst = GDALRaster(config('TCSI_ap_FILEPATH'), write=False)
thumbnail = rst.bands[0].data()
print('array type: ', type(thumbnail))

if thumbnail is not None:
    plt.imshow(thumbnail)
    plt.colorbar()
    # plt.title('Overview - Band 4 {}'.format(thumbnail.shape))
    plt.xlabel('Column #')
    plt.ylabel('Row #')
    plt.show()


