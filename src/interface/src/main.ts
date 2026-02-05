import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import * as Sentry from '@sentry/angular';
import { AppModule } from '@app/app.module';
import { createSentryConfig } from './sentry.config';
import { environment } from '@env/environment';

if (environment.production) {
  enableProdMode();
}

const sentryConfig = createSentryConfig();

if (environment.sentry.dsn_url !== undefined) {
  Sentry.init(sentryConfig);
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
