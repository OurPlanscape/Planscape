# Feature Flags

Edit the `FEATURE_FLAGS` variable under the `.env` located at the root of the project.

The variable should be a comma separated list of flags. If the flag is present, it means it's true.
The name and value of the flag will be shared by frontend and backend.

```shell
 FEATURE_FLAGS="FLAG_ONE,FLAG_TWO"
```

## Current flags

`MAPLIBRE_ON_EXPLORE` : Shows explore page with maplibre (also called explore v2)

`SCENARIO_IMPROVEMENTS` : Shows Scenario Analytics and other improvements

`CONUS_WIDE_SCENARIOS` : Enable CONUS wide scenarios
