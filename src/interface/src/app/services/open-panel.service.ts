import { Injectable } from '@angular/core';
import { OpenPanel } from '@openpanel/web';

import { environment } from '@env/environment';

/**
 * Owns the OpenPanel web SDK instance so components can emit product events
 * without each one reaching for the SDK. Initialized once from the app root;
 * every method is a no-op while tracking is disabled for the environment.
 */
@Injectable({
  providedIn: 'root',
})
export class OpenPanelService {
  private openPanel: OpenPanel | null = null;

  /** Starts the SDK. Safe to call more than once - only the first call runs. */
  init(): void {
    if (!environment.open_panel_enabled || this.openPanel) {
      return;
    }
    this.openPanel = new OpenPanel({
      apiUrl: 'https://op.sig-gis.com/api',
      clientId: environment.open_panel_key,
      trackScreenViews: true,
      trackOutgoingLinks: true,
      trackAttributes: true,
    });
  }

  /**
   * Emits an event. Names follow the backend convention (`app.model.verb`) so
   * client and server events for the same flow line up in OpenPanel.
   *
   * Reach for this when the event needs properties from component state, or
   * when it fires on something other than a click - after an async call
   * succeeds, for instance. Otherwise prefer what the SDK already tracks:
   * - a plain click on a button or anchor: add `data-track="event.name"` to the
   *   element (plus any `data-*` attributes as properties), handled by
   *   `trackAttributes`
   * - navigation: already emitted as `screen_view` by `trackScreenViews`
   * - clicks on links to other hosts: already emitted as `link_out` by
   *   `trackOutgoingLinks`
   *
   * Those three are automatic, so re-emitting them here double counts.
   */
  trackEvent(name: string, properties?: Record<string, unknown>): void {
    this.openPanel?.track(name, properties);
  }
}
