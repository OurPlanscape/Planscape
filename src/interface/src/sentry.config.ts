import * as Sentry from '@sentry/browser';
import { environment } from '@env/environment';

interface SentryConfig {
  dsn?: string;
  environment?: string;
  integrations?: any[];
  profilesSampleRate?: number;
  tracesSampleRate?: number;
}

// dyanmically set sentry init configuration, based on environment.*.ts
export function createSentryConfig(): Sentry.BrowserOptions {
  const integrations = [];
  const configObject: SentryConfig = {
    dsn: environment.sentry?.dsn_url,
    environment: environment.environment,
  };

  if (environment.sentry?.enable_profiling) {
    integrations.push(Sentry.browserProfilingIntegration());
    configObject.profilesSampleRate =
      environment.sentry?.profiling_sample_rate ?? 0.0;
  }

  if (environment.sentry?.enable_context_lines) {
    integrations.push(Sentry.contextLinesIntegration());
  }

  if (environment.sentry?.enable_extra_error_data) {
    integrations.push(Sentry.extraErrorDataIntegration());
  }

  if (environment.sentry?.enable_httpclient) {
    integrations.push(Sentry.httpClientIntegration());
  }

  if (environment.sentry?.enable_browser_reporting) {
    const reportingOptions = {
      interventions: Boolean(environment.sentry.enable_interventions_reporting),
      deprecations: Boolean(environment.sentry.enable_deprecations_reporting),
      crashes: Boolean(environment.sentry.enable_crash_reporting),
    } as Parameters<typeof Sentry.reportingObserverIntegration>[0];
    integrations.push(Sentry.reportingObserverIntegration(reportingOptions));
  }
  configObject.integrations = integrations;
  return configObject;
}
