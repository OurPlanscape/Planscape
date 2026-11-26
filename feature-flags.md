# Feature Flags

Edit the `FEATURE_FLAGS` variable under the `.env` located at the root of the project.

The variable should be a comma separated list of flags. If the flag is present, it means it's true.
The name and value of the flag will be shared by frontend and backend.

```shell
 FEATURE_FLAGS="FLAG_ONE,FLAG_TWO"
```

## Current flags

`API_ZONAL_STATS`: Calculate Zonal Status using Stand-Metrics API

`DATA_ORGANIZATION`: Enables Data Organization

`DATA_UPLOAD`: Enables the user to upload data

`FRONTEND_UPLOAD`: The upload button opens the in-app upload dialog instead of the QGIS hand-off

`CATASTROPHIC_REDUCTION`: Features related to Catastrophic Fire Reduction stats in FoR

`IMPROVED_TREATMENT_GOAL`: Enables the new Improved Treatment Goal step

`RASTER_CDN`: Backend only. Raster datalayer URLs point to Cloud CDN and stay the same for 15 days, instead of a new GCS signed URL per request. Needs `RASTER_CDN_BASE_URL`, `RASTER_CDN_KEY_NAME` and `RASTER_CDN_SIGNING_KEY`
