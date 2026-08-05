import { Injectable } from '@angular/core';

import { MixpanelService } from '@services/mixpanel.service';
import { OpenPanelService } from '@services/open-panel.service';

/**
 * Single entry point for product analytics while we migrate from OpenPanel to
 * Mixpanel.
 *
 * Distinct from `AnalyticsService`, which is Google Analytics.
 *
 * Event names follow the backend convention (`app.model.verb`) so client and
 * server events for the same flow line up.
 *
 * Call `trackEvent` explicitly for anything worth naming. T
 *
 * What you should NOT re-emit here, because both SDKs already send it:
 * - navigation: `screen_view` on OpenPanel, `$mp_web_page_view` on Mixpanel
 * - any click: `link_out` on OpenPanel, `$mp_click` on Mixpanel
 */
@Injectable({
  providedIn: 'root',
})
export class ProductAnalyticsService {
  constructor(
    private openPanelService: OpenPanelService,
    private mixpanelService: MixpanelService
  ) {}

  /** Starts both SDKs. Safe to call more than once. */
  init(): void {
    this.openPanelService.init();
    this.mixpanelService.init();
  }

  trackEvent(name: string, properties?: Record<string, unknown>): void {
    this.openPanelService.trackEvent(name, properties);
    this.mixpanelService.track(name, properties);
  }
}
