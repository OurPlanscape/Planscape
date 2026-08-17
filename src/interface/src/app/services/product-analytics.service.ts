import { Injectable } from '@angular/core';

import { MixpanelService } from '@services/mixpanel.service';

/**
 * Single entry point for product analytics. Components depend on this rather
 * than on Mixpanel directly, so swapping or adding an SDK stays a change to
 * this file instead of a hunt through call sites.
 *
 * Distinct from `AnalyticsService`, which is Google Analytics.
 *
 * Event names follow the backend convention (`app.model.verb`) so client and
 * server events for the same flow line up.
 *
 * Call `trackEvent` explicitly for anything worth naming. Do NOT re-emit what
 * Mixpanel's autocapture already sends - navigation as `$mp_web_page_view` and
 * clicks as `$mp_click` - or you will double count. A presentational component
 * that shouldn't know about analytics can expose an `@Output` and let its
 * consumer track it.
 */
@Injectable({
  providedIn: 'root',
})
export class ProductAnalyticsService {
  constructor(private mixpanelService: MixpanelService) {}

  /** Starts the SDK. Safe to call more than once. */
  init(): void {
    this.mixpanelService.init();
  }

  trackEvent(name: string, properties?: Record<string, unknown>): void {
    this.mixpanelService.track(name, properties);
  }
}
