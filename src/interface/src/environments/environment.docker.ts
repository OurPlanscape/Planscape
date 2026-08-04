import { applyRuntimeConfig } from './runtime-config';

// Docker development defaults. Local non-Docker development still uses environment.dev.ts.
export const environment = applyRuntimeConfig({
  environment: 'docker',
  production: false,
  isCatalogEnvironment: false,
  backend_endpoint: 'http://localhost:8000/planscape-backend',
  google_analytics_id: '',
  download_endpoint: '',
  martin_server: 'https://dev.planscape.org/tiles/',
  mapbox_key: '',
  open_panel_key: '',
  open_panel_enabled: false,
  mixpanel_token: '',
  mixpanel_enabled: false,
  debug_layers: false,
  sentry: {
    dsn_url: '',
    enable_extra_error_data: true,
    enable_httpclient: true,
    enable_browser_reporting: true,
    enable_interventions_reporting: true,
    enable_crash_reporting: true,
    enable_profiling: false,
    traces_sample_rate: 0.0,
    profiling_sample_rate: 0.0,
    enable_context_lines: false,
    enable_deprecations_reporting: false,
  },
});
