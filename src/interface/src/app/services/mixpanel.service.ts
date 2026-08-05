import { Injectable, NgZone } from '@angular/core';
import mixpanel from 'mixpanel-browser';

import { environment } from '@env/environment';
import { User } from '@types';
import { AuthService } from '@services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class MixpanelService {
  private enabled = false;

  constructor(
    private authService: AuthService,
    private zone: NgZone
  ) {}

  /**
   * Initializes Mixpanel and keeps the profile in sync with the logged in user.
   * Safe to call more than once - only the first call runs.
   */
  init(): void {
    if (
      this.enabled ||
      !environment.mixpanel_enabled ||
      !environment.mixpanel_token
    ) {
      return;
    }

    // Must run outside the zone: zone.js patches the listeners and
    // MutationObserver autocapture installs, so in-zone they'd fire change
    // detection on every DOM change - and autocapture mutates the DOM as it
    // walks it, looping until the tab freezes. Tracking still works.
    this.zone.runOutsideAngular(() => {
      mixpanel.init(environment.mixpanel_token, {
        autocapture: true,
        // Pageviews fire on any URL change, query-string-only ones included, so
        // the planning areas list emits several per search. To count only real
        // route changes: autocapture: { pageview: 'url-with-path' }
        record_sessions_percent: 100,
      });
    });
    this.enabled = true;

    this.authService.loggedInUser$.subscribe((user) => {
      // `undefined` means we haven't resolved the session yet, so we don't
      // know if this is an anonymous visitor or a logged out user.
      if (user === undefined) {
        return;
      }
      if (user) {
        this.identify(user);
      } else {
        this.reset();
      }
    });
  }

  /**
   * Ties the current browser session to a user profile. The distinct id must
   * match the backend's (`str(user.pk)` on `planscape/analytics.py`) so events
   * tracked on both sides land on the same profile.
   */
  identify(user: User): void {
    if (!this.enabled || !user.id) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      mixpanel.identify(String(user.id));
      mixpanel.people.set({
        $first_name: user.firstName,
        $last_name: user.lastName,
        $email: user.email,
      });
    });
  }

  reset(): void {
    if (!this.enabled) {
      return;
    }
    this.zone.runOutsideAngular(() => mixpanel.reset());
  }

  track(name: string, properties?: Record<string, any>): void {
    if (!this.enabled) {
      return;
    }
    this.zone.runOutsideAngular(() => mixpanel.track(name, properties));
  }
}
