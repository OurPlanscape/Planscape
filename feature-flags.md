# Feature Flags

Edit the `FEATURE_FLAGS` variable under the `.env` located at the root of the project.

The variable should be a comma separated list of flags. If the flag is present, it means it's true.
The name and value of the flag will be shared by frontend and backend.

```shell
 FEATURE_FLAGS="FLAG_ONE,FLAG_TWO"
```

## Current flags

`PLANNING_APPROACH` : Allows planning approach where users can prioritize sub-units during scenario workflow

`SCENARIO_DASHBOARDS` : Enables new dashboards for scenarios, project areas and treatment effects

`PRIORITY_OBJECTIVE_WEIGHTING`: Enables Priority objective weighting
