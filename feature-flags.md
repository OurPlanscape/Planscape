# Feature Flags

Edit the `FEATURE_FLAGS` variable under the `.env` located at the root of the project.

The variable should be a comma separated list of flags. If the flag is present, it means it's true.
The name and value of the flag will be shared by frontend and backend.

```shell
 FEATURE_FLAGS="FLAG_ONE,FLAG_TWO"
```

## Current flags

`CONUS_WIDE_SCENARIOS` : Enable CONUS wide scenarios

`DYNAMIC_SCENARIO_MAP`: Shows stands on new scenario configuration steps"

`CLIMATE_FORESIGHT`: Enables Climate Foresight analytics tool

`AUTO_CREATE_STANDS`: Enables the creation of stands during the creation of new planning areas

`SCENARIO_DRAFTS`: Enable the scenario drafts

`FORSYS_VIA_API`: Enable Forsys execution on stand alone R server

`PAGINATED_STAND_METRICS`: Enable pagination on stand metric calculation during Scenario creation

`RASTERIO_WINDOWED_READ`: Enable windowed read of raster files (unstable)

`FORSYS_PREPROCESSED`: Enable Forsys execution with pre-processed data (forsys_input field)
