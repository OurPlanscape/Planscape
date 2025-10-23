import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { CurrencyPipe } from '@angular/common';

import { ScenarioRoutePlaceholderComponent } from './scenario-route-placeholder';
import { ResourceUnavailableComponent } from 'src/app/shared/resource-unavailable/resource-unavailable.component';
import { ScenarioCreationComponent } from '../scenario-creation/scenario-creation.component';
import { UploadedScenarioViewComponent } from '../uploaded-scenario-view/uploaded-scenario-view.component';
import { ViewScenarioComponent } from '../view-scenario/view-scenario.component';

import { FeatureService } from 'src/app/features/feature.service';
import { FEATURES_JSON } from 'src/app/features/features-config';
import { FeaturesModule } from 'src/app/features/features.module';

import { ScenarioState } from '../scenario.state';
import { AuthService } from '@services';
import { Resource, Scenario } from '@types';

describe('ScenarioRoutePlaceholderComponent', () => {
  let fixture: ComponentFixture<ScenarioRoutePlaceholderComponent>;
  let component: ScenarioRoutePlaceholderComponent;

  let routerSpy: jasmine.SpyObj<Router>;

  const mockUser$ = new BehaviorSubject<any>({ id: 1 });
  const mockScenarioResource$ = new BehaviorSubject<Resource<Scenario>>(
    {} as any
  );
  const mockScenario$ = new BehaviorSubject<Scenario>({} as any);

  const createComp = () => {
    fixture = TestBed.createComponent(ScenarioRoutePlaceholderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        HttpClientTestingModule,
        RouterTestingModule,
        FeaturesModule,
        ScenarioRoutePlaceholderComponent,
      ],
      declarations: [
        MockDeclarations(
          ResourceUnavailableComponent,
          ScenarioCreationComponent,
          UploadedScenarioViewComponent,
          ViewScenarioComponent
        ),
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        FeatureService,
        MockProvider(CurrencyPipe),
        MockProvider(AuthService, { loggedInUser$: mockUser$ }),
        MockProvider(ScenarioState, {
          currentScenarioResource$: mockScenarioResource$,
          currentScenario$: mockScenario$,
        }),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    TestBed.overrideProvider(FEATURES_JSON, {
      useValue: { SCENARIO_DRAFTS: false },
    });
    createComp();
    expect(component).toBeTruthy();
  });

  it('should return false if SCENARIO_DRAFTS is disabled and the scenario is NOT a draft', async () => {
    TestBed.overrideProvider(FEATURES_JSON, {
      useValue: { SCENARIO_DRAFTS: false },
    });
    mockUser$.next({ id: 1 });
    mockScenario$.next({
      user: 2,
      planning_area: 5,
      scenario_result: { status: 'SUCCESS' },
    } as any);
    createComp();

    const canViewScenarioCreation = await firstValueFrom(
      component.canViewScenarioCreation$
    );

    expect(canViewScenarioCreation).toBeFalse();
  });

  it('should return false if SCENARIO_DRAFTS is disabled and the scenario is a DRAFT and redirect to planning area', async () => {
    TestBed.overrideProvider(FEATURES_JSON, {
      useValue: { SCENARIO_DRAFTS: false },
    });
    mockScenario$.next({
      scenario_result: { status: 'DRAFT' },
      planning_area: 1,
    } as any);
    createComp();

    const canViewScenarioCreation = await firstValueFrom(
      component.canViewScenarioCreation$
    );

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/plan', 1]);
    expect(canViewScenarioCreation).toBeFalse();
  });

  it('should return false if SCENARIO_DRAFTS is enabled and the scenario is not a DRAFT', async () => {
    TestBed.overrideProvider(FEATURES_JSON, {
      useValue: { SCENARIO_DRAFTS: true },
    });
    mockScenario$.next({
      scenario_result: { status: 'SUCCESS' }, // Not a draft
    } as any);
    createComp();

    const canViewScenarioCreation = await firstValueFrom(
      component.canViewScenarioCreation$
    );

    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(canViewScenarioCreation).toBeFalse();
  });

  it('should return false if SCENARIO_DRAFTS is enabled but the draft was not created by the logged in user and navigate to planning area', async () => {
    TestBed.overrideProvider(FEATURES_JSON, {
      useValue: { SCENARIO_DRAFTS: true },
    });
    mockUser$.next({ id: 1 });
    mockScenario$.next({
      user: 2,
      planning_area: 5,
      scenario_result: { status: 'DRAFT' },
    } as any);
    createComp();

    const canViewScenarioCreation = await firstValueFrom(
      component.canViewScenarioCreation$
    );

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/plan', 5]);
    expect(canViewScenarioCreation).toBeFalse();
  });

  it('should return true if SCENARIO_DRAFTS is enabled and the draft was created by the logged in user', async () => {
    TestBed.overrideProvider(FEATURES_JSON, {
      useValue: { SCENARIO_DRAFTS: true },
    });
    mockUser$.next({ id: 1 });
    mockScenario$.next({
      user: 1,
      planning_area: 5,
      scenario_result: { status: 'DRAFT' },
    } as any);
    createComp();

    const canViewScenarioCreation = await firstValueFrom(
      component.canViewScenarioCreation$
    );

    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(canViewScenarioCreation).toBeTrue();
  });

  // Navigation tests

  it('should show loading spinner when resource is loading', async () => {
    TestBed.overrideProvider(FEATURES_JSON, {
      useValue: { SCENARIO_DRAFTS: true },
    });
    mockScenarioResource$.next({ isLoading: true });
    createComp();
    const spinner =
      fixture.debugElement.nativeElement.querySelector('mat-spinner');
    expect(spinner).toBeTruthy();
  });

  it('should show app-scenario-creation when scenario is DRAFT and user is owner', async () => {
    TestBed.overrideProvider(FEATURES_JSON, {
      useValue: { SCENARIO_DRAFTS: true },
    });
    mockScenarioResource$.next({ isLoading: false });
    mockUser$.next({ id: 1 });
    mockScenario$.next({
      user: 1,
      planning_area: 5,
      scenario_result: { status: 'DRAFT' },
    } as any);

    createComp();

    const component = fixture.debugElement.nativeElement.querySelector(
      'app-scenario-creation'
    );
    expect(component).toBeTruthy();
  });

  it('should show resource unavailable component on error', async () => {
    TestBed.overrideProvider(FEATURES_JSON, {
      useValue: { SCENARIO_DRAFTS: true },
    });

    mockScenarioResource$.next({
      isLoading: true,
      error: { name: 'terrible error', message: 'something failed' },
    });
    createComp();
    const spinner =
      fixture.debugElement.nativeElement.querySelector('mat-spinner');
    expect(spinner).toBeTruthy();
  });


  it('should show scenario view if scenario was not uploaded and status is SUCCESS', async () => {
    TestBed.overrideProvider(FEATURES_JSON, {
      useValue: { SCENARIO_DRAFTS: true },
    });
    mockScenarioResource$.next({
      isLoading: false,
    });
    mockScenario$.next({
      user: 1,
      scenario_result: { status: 'SUCCESS', completed_at: '' },
    } as any);
    createComp();
    const component =
      fixture.debugElement.nativeElement.querySelector('app-view-scenario');
    expect(component).toBeTruthy();
  });

  it('should show scenario view if scenario was not uploaded and status is PENDING', async () => {
    TestBed.overrideProvider(FEATURES_JSON, {
      useValue: { SCENARIO_DRAFTS: true },
    });
    mockScenarioResource$.next({
      isLoading: false,
    });
    mockScenario$.next({
      user: 1,
      scenario_result: { status: 'PENDING', completed_at: '' },
    } as any);
    createComp();

    const component =
      fixture.debugElement.nativeElement.querySelector('app-view-scenario');
    expect(component).toBeTruthy();
  });
});
