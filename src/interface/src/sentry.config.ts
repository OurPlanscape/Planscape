// sentry.config.ts
import * as Sentry from '@sentry/browser';
import { environment } from './environments/environment';

export function createSentryConfig(): Sentry.BrowserOptions {

    const integrations = [];
    if (environment.sentry?.enable_profiling) {
        integrations.push(Sentry.browserTracingIntegration());
    }

    if (environment.sentry?.enable_profiling) {
        integrations.push(Sentry.browserProfilingIntegration());
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
    return {
        dsn: environment.sentry?.dsn_url,
        environment: environment.environment,
        integrations: integrations,
        // Tracing (tracesSampleRate is now within browserTracingIntegration)
        profilesSampleRate: environment.sentry?.enable_profiling ? environment.sentry?.enable_profiling_sample_rate : 0.0,
        // Add other Sentry options here if needed
    };
}