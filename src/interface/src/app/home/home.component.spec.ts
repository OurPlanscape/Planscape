import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { AuthService } from '../services';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { FEATURES_JSON } from '../features/features-config';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  function setUpComponent() {
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeComponent],
      providers: [
        {
          provide: AuthService,
          useValue: { loggedInStatus$: new BehaviorSubject(false) },
        },
        { provide: FEATURES_JSON, useValue: { login: false } },
      ],

      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  describe('login feature off', () => {
    it('should show region and preview section', () => {
      setUpComponent();
      const planTable = fixture.debugElement.query(By.css('app-preview'));
      const regionSelection = fixture.debugElement.query(
        By.css('app-region-selection')
      );
      expect(planTable).toBeTruthy();
      expect(regionSelection).toBeTruthy();
    });
  });

  describe('login feature on', () => {
    beforeEach(() => {
      TestBed.overrideProvider(FEATURES_JSON, {
        useValue: { login: true },
      });
      setUpComponent();
    });
    it('should show welcome if not logged in', () => {
      const auth = TestBed.inject(AuthService);
      auth.loggedInStatus$.next(false);
      fixture.detectChanges();
      const planTable = fixture.debugElement.query(By.css('app-welcome'));
      expect(planTable).toBeTruthy();
    });
    it('should show planning areas if logged in', () => {
      const auth = TestBed.inject(AuthService);
      auth.loggedInStatus$.next(true);
      fixture.detectChanges();
      const planTable = fixture.debugElement.query(
        By.css('app-planning-areas')
      );
      expect(planTable).toBeTruthy();
    });
  });
});
