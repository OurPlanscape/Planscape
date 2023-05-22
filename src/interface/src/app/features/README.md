# Features.json
The features.json flag is needed to enable or disable certain features that are
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

### show_socal
This flag will display the option to switch to the Southern California region,
and therefore allow for the display of Southern California data.

### top_percent_slider
This flag shows the slider displayed in the scenario generator UI (plan phase).

### unlaunched_layers
This flag will hide map layers that are not currently launched or implemented
when set to false. Once layers are launched in prod, they should be changed in
map-control-panel.component.html so they are no longer affected by this flag.

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
  "show_socal": false,
  "testFalseFeature": false,
  "testTrueFeature": true,
  "top_percent_slider": true,
  "unlaunched_layers": false
}
```