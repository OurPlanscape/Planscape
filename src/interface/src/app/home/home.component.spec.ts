import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeComponent } from './home.component';
import { AuthService } from '../services';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, of } from 'rxjs';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeComponent],
      providers: [
        {
          provide: AuthService,
          useValue: { loggedInStatus$: new BehaviorSubject(false) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show plan table if logged in', () => {
    const auth = TestBed.inject(AuthService);
    auth.loggedInStatus$.next(true);
    fixture.detectChanges();
    const planTable = fixture.debugElement.query(By.css('app-plan-table'));
    expect(planTable).toBeTruthy();
  });

  it('should not show home/welcome  if logged in', () => {
    const auth = TestBed.inject(AuthService);
    auth.loggedInStatus$.next(true);
    fixture.detectChanges();
    const planTable = fixture.debugElement.query(
      By.css('app-region-selection'),
    );
    expect(planTable).toBeFalsy();
  });

  it('should show home/welcome if not logged in', () => {
    const auth = TestBed.inject(AuthService);
    auth.loggedInStatus$.next(false);
    fixture.detectChanges();
    const planTable = fixture.debugElement.query(
      By.css('app-region-selection'),
    );
    expect(planTable).toBeTruthy();
  });

  it('should not show plan table if not logged in', () => {
    const auth = TestBed.inject(AuthService);
    auth.loggedInStatus$.next(false);
    fixture.detectChanges();
    const planTable = fixture.debugElement.query(By.css('app-plan-table'));
    expect(planTable).toBeFalsy();
  });
});
