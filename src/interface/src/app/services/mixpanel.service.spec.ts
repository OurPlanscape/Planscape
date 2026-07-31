import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import mixpanel from 'mixpanel-browser';

import { environment } from '@env/environment';
import { User } from '@types';
import { AuthService } from '@services/auth.service';
import { MixpanelService } from '@services/mixpanel.service';

describe('MixpanelService', () => {
  let service: MixpanelService;
  let loggedInUser$: BehaviorSubject<User | null | undefined>;
  let peopleSet: jasmine.Spy;

  const originalEnabled = environment.mixpanel_enabled;
  const originalToken = environment.mixpanel_token;
  const originalPeople = mixpanel.people;

  beforeEach(() => {
    loggedInUser$ = new BehaviorSubject<User | null | undefined>(undefined);

    spyOn(mixpanel, 'init');
    spyOn(mixpanel, 'identify');
    spyOn(mixpanel, 'reset');
    // `mixpanel.people` only exists once the real `init` has run, and we stub
    // that out here, so we provide the bits the service reaches for.
    peopleSet = jasmine.createSpy('people.set');
    (mixpanel as any).people = { set: peopleSet };

    TestBed.configureTestingModule({
      providers: [
        MixpanelService,
        { provide: AuthService, useValue: { loggedInUser$ } },
      ],
    });
    service = TestBed.inject(MixpanelService);
  });

  afterEach(() => {
    environment.mixpanel_enabled = originalEnabled;
    environment.mixpanel_token = originalToken;
    (mixpanel as any).people = originalPeople;
  });

  describe('when disabled', () => {
    beforeEach(() => {
      environment.mixpanel_enabled = false;
      environment.mixpanel_token = 'some-token';
      service.init();
    });

    it('does not initialize mixpanel', () => {
      expect(mixpanel.init).not.toHaveBeenCalled();
    });

    it('ignores tracking calls', () => {
      loggedInUser$.next({ id: 1 });
      expect(mixpanel.identify).not.toHaveBeenCalled();
    });
  });

  describe('when enabled', () => {
    beforeEach(() => {
      environment.mixpanel_enabled = true;
      environment.mixpanel_token = 'some-token';
      service.init();
    });

    it('initializes mixpanel with the configured token', () => {
      expect(mixpanel.init).toHaveBeenCalledWith('some-token', {
        autocapture: true,
        record_sessions_percent: 100,
      });
    });

    it('does not identify before the session is resolved', () => {
      expect(mixpanel.identify).not.toHaveBeenCalled();
      expect(mixpanel.reset).not.toHaveBeenCalled();
    });

    it('identifies with the user id, matching the backend distinct id', () => {
      loggedInUser$.next({
        id: 42,
        email: 'me@planscape.org',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });

      expect(mixpanel.identify).toHaveBeenCalledWith('42');
      expect(peopleSet).toHaveBeenCalledWith({
        $first_name: 'Ada',
        $last_name: 'Lovelace',
        $email: 'me@planscape.org',
      });
    });

    it('resets on logout', () => {
      loggedInUser$.next({ id: 42 });
      loggedInUser$.next(null);

      expect(mixpanel.reset).toHaveBeenCalled();
    });
  });
});
