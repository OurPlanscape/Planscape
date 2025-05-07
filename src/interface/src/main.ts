import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import * as Sentry from '@sentry/angular';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}
if (environment.sentry_dsn_url !== undefined) {
  Sentry.init({
    dsn: environment.sentry_dsn_url,
    environment: environment.environment,
    integrations: [Sentry.browserTracingIntegration()],
    // Tracing
    tracesSampleRate: 0.2,
  });
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
