Feature flags are set in features.json and will hide certain features if the corresponding flag is set to false. 

features.json should be gitignored in the future once prod build is rolled out.

By default, set the values of new fields to match what prod should be so that we do not risk releasing something unexpected.  The exception is "login", which is left on so that automated tests run properly.

login: This flag will hide the login/account signup buttons and will disable any features that require login to use (e.g planning) when set to false. When login is disabled it also replaces the plans on the homepage with a message explaining that some buttons and features are disabled.  

show_socal: This flag will display the option to switch to the Southern California region, and therefore allow for the display of Southern California data.

top_percent_slider: This flag shows the slider displayed in the scenario generator UI (plan phase).

unlaunched_layers: This flag will hide map layers that are not currently launched or implemented when set to false. Once layers are launched in prod, they should be changed in map-control-panel.component.html so they are no longer affected by this flag.

