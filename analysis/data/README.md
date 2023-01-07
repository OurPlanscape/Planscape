# Input Data Folder

Files in this folder were excluded from the git version control system due to file size. This file describes what files are required to reproduce the analysis and gives links to websites for downloading the data.

## TCSI Dataset

From: <http://northcoastxy.com/tcsi/#>

The Tahoe Central Sierra Initiative (TCSI) Blueprint is a set of strategy maps that identify opportunities for forest protection and adaptation across a 2.4-million-acre region of the central Sierra Nevada. Its aim is to improve resilience across the region to anticipated climate change and wildfire-, beetle-, and drought-caused tree mortality.

The data comes as 15-m raster maps that can be downloaded as zipfiles (`.tif` and `.png`). Each file include several maps, each reflecting a different evaluation of the data:

1.  *Current* evaluates current (2019) conditions against target or desired conditions and outputs a map with cell values ranging from -1 (fully departed, red) to +1 (within target conditions, blue).
2.  *Future* map similarly evaluates future (2020-2060) conditions, which were quantified using LANDIS-II simulation modeling to determine the potential for a given cell to reach target conditions and the variability of conditions over time.
3.  *Strategy* Several other maps were developed that directly integrate both current and future conditions assessments to better identify broad restoration strategies best suited to the modeled outcomes:

-   **Monitor** scores indicate areas that are in good condition now and into the future; suggesting managment intervention may not be necessary in the short term. Darker blue colors indicate Monitor scores closer to +1 and provide stronger support for the monitoring strategy.
-   **Protect** scores indicate areas that are currently in good condition but conditions deteriorate over time; suggesting treatments in and around these areas may help maintain them over time. Darker orange colors indicate Protect scores closer to +1 and provide stronger support for the protection strategy.
-   **Adapt** scores indicate areas that are currently in poor condition but, under natural disturbance processes, exhibit the capacity to achieve desired conditions in the future. Managmenet in these areas would have a higher likelihood of success given their demonstrated ability to achieve and maintain target conditions over time. Darker purple colors indicate Adapt scores closer to +1 and provide stronger support for the adaptation strategy.
-   **Transform** scores indicate areas that are currently in poor condition and remain so over time. In terms of sequencing treatments over large landscapes, these areas may not be the first in line for treatment given the lack of evidence for them to achieve and maintain target conditions over time, thereby increasing the uncertainty in management effectivness. Darker red colors indicate Transform scores closer to +1 and provide stronger support for the transformation strategy.
-   **ap** (a.k.a impact) scores indicate the maximum level of support for either Adapt or Protect strategies. These areas would benefit most from management given the goals of protecting resources that are currently functional on the landscape (Protect) and treating those areas with the highest certainty of success from treatment (Adapt). Red colors (scores closer to +1) indicate areas with strong support for either Adapt or Protect strategies, while blue colors (scores closer to -1) indicate low support for these strategies.


## California Building Outlines

From: <https://github.com/Microsoft/USBuildingFootprints>

GeoJSON with building outlines for California, generated from satellite imagery
using an ANN computer vision model. We're converting this to a raster layer 
because the highly detailed shapefile would be too big to display the web
UI of Planscape. See issue
[#277](https://github.com/OurPlanscape/Planscape/issues/277)


# BMFP Notebook Data

From: <https://drive.google.com/file/d/1zNYZRTgNEX4mNAtU1I3-7RD8VSo8-ATH/view?usp=sharing/BMFP_Notebook_data.zip>

Contains Tiger Roads data for California which we use to calculate distance
from nearest road for treatment cost calculations