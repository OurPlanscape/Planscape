# Feature Flags

Edit the `FEATURE_FLAGS` variable under the `.env` located at the root of the project.

The variable should be a comma separated list of flags. If the flag is present, it means it's true.
The name and value of the flag will be shared by frontend and backend.

```shell
 FEATURE_FLAGS="FLAG_ONE,FLAG_TWO"
```

## Current flags

`CLIMATE_FORESIGHT`: Enables Climate Foresight analytics tool

`CUSTOM_EXCEPTION_HANDLER` : Enables common error format in backend payloads

`CUSTOM_SCENARIOS` : Allows custom scenarios

`PLANNING_APPROACH` : Allows planning approach where users can prioritize sub-units during scenario workflow
