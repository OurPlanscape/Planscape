# Features.json
The features.json file is needed to enable or disable certain features that are
under development or newly released.  You should add a features.json file (see
below) in this directory before running angular.  The file is listed in the
toplevel .gitignore so that it does not get overwritten with pulls.

By convention, try to name feature flags such that "true" will enable things to
the user, while "false" will hide them.  By default, we should keep new flags
set to false, and your code should be testing for "true".  This also will
reduce the risk of releasing smoething unexpected to production.
The exceptions are for "login" and "top_percent_slider", both of which need to
be enabled for tests to run properly.

## Flag Descriptions

### login
This flag will hide the login/account signup buttons and will disable any
features that require login to use (e.g planning) when set to false. When login
is disabled it also replaces the plans on the homepage with a message
explaining that some buttons and features are disabled.  

### show_centralcoast
This flag will display the option to switch to the Central Coast region,
and therefore allow for the display of Central Coast data.

### show_future_control_panel
This flag will enable future condition options in the map control panel for all regions. A region-specific flag, "future_data", can be found for each region in Planscape/src/planscape/config/conditions.json. When "show_future_control_panel" is set to true and "future_data" is set to true for a region, the future condition layers will appear in the map control panel. When "show_future_control_panel" is set to true and "future_data" is set to false for a region, "Future Climate Stability (coming soon)" will appear in the map control panel. 

### show_socal
This flag will display the option to switch to the Southern California region,
and therefore allow for the display of Southern California data.

### show_translated_control_panel
This flag will enable translated condition options in the map control panel for all regions. A region-specific flag, "translated_data", can be found for each region in Planscape/src/planscape/config/conditions.json. When "show_translated_control_panel" is set to true and "translated_data" is set to true for a region, the translated condition layers will appear in the map control panel. When "show_translated_control_panel" is set to true and "translated_data" is set to false for a region, "Current Conditions (coming soon)" will appear in the map control panel. 

### top_percent_slider
This flag shows the slider displayed in the scenario generator UI (plan phase).

### unlaunched_layers
This flag will hide map layers that are not currently launched or implemented
when set to false. Once layers are launched in prod, they should be changed in
map-control-panel.component.html so they are no longer affected by this flag.

###  upload_project_area
This flag will enable the Project Area control panel in the Scenario Configuration page. That will allow users to choose between having their Project Areas determined for them, or uploading their own zipped shapefiles. 

### use_its
This flag will enable use of ITS data for past resilience projects rather than
Calmapper.

### new_navigation
This flag controls the changes regarding the new navigation

### Other flags
There are two other flags, testFalseFeature and testTrueFeature created just for
automated testing.  Their values should be kept to "false" and "true" for
angular tests to pass.

## Sample features.json
Here is a sample features.json file that minimally enables features to allow
for angular tests to pass.  You can start with this, but later enable settings.
```
{
  "login": true,
  "show_centralcoast": false,
  "show_future_control_panel": false,
  "show_socal": false,
  "show_translated_control_panel": false
  "testFalseFeature": false,
  "testTrueFeature": true,
  "top_percent_slider": true,
  "unlaunched_layers": false,
  "upload_project_area": false,
  "use_its": false
}
```

# Feature Flag directive

Use the feature flag directive to show or hide content on your markup.

```angular2html
<div *featureFlag="'your_flag'">
  Show me when the flag is on!
</div>
```
You can alternatively hide content if the flag is on.

```angular2html
<div *featureFlag="'your_flag'; hide: true">
  Hide me when the flag is on!
</div>
```
