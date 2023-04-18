Feature flags are set in features.json and will hide certain features if the corresponding flag is set to false. 

features.json should be gitignored in the future once prod build is rolled out.  

login: This flag will hide the login/account signup buttons and will disable any features that require login to use (e.g planning). It also replaces the plans on the homepage with a message explaining that some buttons and features are disabled.  

unlaunched_layers: This flag will hide map layers that are not currently launched or implemented. Once layers are launched in prod, they should be changed in map-control-panel.component.html so they are no longer affected by this flag.
