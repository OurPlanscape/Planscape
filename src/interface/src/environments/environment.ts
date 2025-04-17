// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  backend_endpoint: 'http://localhost:8000/planscape-backend',
  google_analytics_id: '', // Replace with actual ID.
  tile_endpoint: 'https://dev-geo.planscape.org/geoserver/', // Replace with actual URL
  download_endpoint: '', // Replace with actual URL
  martin_server: 'https://dev.planscape.org/tiles/',
  mapbox_key: '',
  open_panel_key: '',
  open_panel_enabled: false,
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
