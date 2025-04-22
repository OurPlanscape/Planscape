import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import * as Sentry from '@sentry/angular';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import { AppComponent } from './app/app.component';

if (environment.production) {
  enableProdMode();
}
if (environment.sentry_dsn_url !== undefined) {
  Sentry.init({
    dsn: environment.sentry_dsn_url,
    environment: environment.sentry_env,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
bootstrapApplication(AppComponent).catch((err) => console.error(err));

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
