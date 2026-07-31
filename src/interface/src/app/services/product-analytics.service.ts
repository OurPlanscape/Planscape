import { Injectable } from '@angular/core';

import { MixpanelService } from '@services/mixpanel.service';
import { OpenPanelService } from '@services/open-panel.service';

/**
 * Single entry point for product analytics while we migrate from OpenPanel to
 * Mixpanel. Mirrors the backend's `_dispatch` (`planscape/openpanel.py`): every
 * event goes to both SDKs, so the two data sets stay comparable until the
 * backfill is signed off. Dropping OpenPanel means deleting one line per method
 * here rather than hunting down call sites.
 *
 * Distinct from `AnalyticsService`, which is Google Analytics.
 *
 * Event names follow the backend convention (`app.model.verb`) so client and
 * server events for the same flow line up.
 *
 * Reach for `trackEvent` when the event needs properties from component state,
 * or when it fires on something other than a click. Otherwise prefer what the
 * SDKs already track:
 * - a plain click on a button or anchor: add `data-track="event.name"` to the
 *   element (plus any `data-*` attributes as properties) and both SDKs pick it
 *   up - OpenPanel via `trackAttributes`, Mixpanel via `MixpanelService`
 * - navigation: `screen_view` on OpenPanel, `$mp_web_page_view` on Mixpanel
 * - clicks on links to other hosts: `link_out` on OpenPanel, `$mp_click` on
 *   Mixpanel
 *
 * Those are automatic on both sides, so re-emitting them here double counts.
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
