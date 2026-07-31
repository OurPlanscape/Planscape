import { Injectable, NgZone, OnDestroy } from '@angular/core';
import mixpanel from 'mixpanel-browser';

import { environment } from '@env/environment';
import { User } from '@types';
import { AuthService } from '@services/auth.service';

/** `data-report-id` -> `reportId`, matching OpenPanel's attribute naming. */
function camelCase(name: string): string {
  return name.replace(/([-_][a-z])/gi, (match) =>
    match.toUpperCase().replace('-', '').replace('_', '')
  );
}

@Injectable({
  providedIn: 'root',
})
export class MixpanelService implements OnDestroy {
  private enabled = false;
  private readonly abortController = new AbortController();

  constructor(
    private authService: AuthService,
    private zone: NgZone
  ) {}

  ngOnDestroy(): void {
    this.abortController.abort();
  }

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

    mixpanel.init(environment.mixpanel_token, {
      autocapture: true,
      // Pageviews fire on any URL change, query-string-only ones included, so
      // the planning areas list emits several per search. To count only real
      // route changes: autocapture: { pageview: 'url-with-path' }
      record_sessions_percent: 100,
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

    this.trackAttributeClicks();
  }

  /**
   * Mirrors OpenPanel's `trackAttributes`, so a `data-track` element emits the
   * same named event to both SDKs while we run them side by side. Element
   * lookup and property naming follow the OpenPanel implementation on purpose -
   * if the two disagree, the event counts won't be comparable.
   *
   * Note this is on top of what autocapture already sends: the same click also
   * shows up as `$mp_click`. Different event name, so no double counting.
   */
  private trackAttributeClicks(): void {
    // Outside the zone - a document-wide click listener would otherwise kick
    // off change detection on every click in the app.
    this.zone.runOutsideAngular(() => {
      document.addEventListener(
        'click',
        (event) => {
          const target = event.target as Element | null;
          if (!target || typeof target.closest !== 'function') {
            return;
          }
          // OpenPanel prefers the nearest button over the nearest anchor.
          const button = target.closest('button');
          const anchor = target.closest('a');
          const element = button?.getAttribute('data-track')
            ? button
            : anchor?.getAttribute('data-track')
              ? anchor
              : null;
          const name = element?.getAttribute('data-track');
          if (!element || !name) {
            return;
          }

          const properties: Record<string, string> = {};
          for (const attribute of Array.from(element.attributes)) {
            if (
              attribute.name.startsWith('data-') &&
              attribute.name !== 'data-track'
            ) {
              properties[camelCase(attribute.name.replace(/^data-/, ''))] =
                attribute.value;
            }
          }
          this.track(name, properties);
        },
        { signal: this.abortController.signal }
      );
    });
  }

  /**
   * Ties the current browser session to a user profile. The distinct id must
   * match the backend's (`str(user.pk)` on `planscape/openpanel.py`) so events
   * tracked on both sides land on the same profile.
   */
  identify(user: User): void {
    if (!this.enabled || !user.id) {
      return;
    }
    mixpanel.identify(String(user.id));
    mixpanel.people.set({
      $first_name: user.firstName,
      $last_name: user.lastName,
      $email: user.email,
    });
  }

  reset(): void {
    if (!this.enabled) {
      return;
    }
    mixpanel.reset();
  }

  track(name: string, properties?: Record<string, any>): void {
    if (!this.enabled) {
      return;
    }
    mixpanel.track(name, properties);
  }
}
