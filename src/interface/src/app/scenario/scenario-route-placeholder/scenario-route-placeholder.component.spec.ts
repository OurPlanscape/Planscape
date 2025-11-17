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

import { NewScenarioState } from '../new-scenario.state';

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
        MockProvider(CurrencyPipe),
        MockProvider(AuthService, { loggedInUser$: mockUser$ }),
        MockProvider(NewScenarioState, {}),
        MockProvider(ScenarioState, {
          currentScenarioResource$: mockScenarioResource$,
          currentScenario$: mockScenario$,
        }),
      ],
    }).compileComponents();
  });

  it('should return false if the scenario is not a DRAFT', async () => {
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

  it('should return false if the draft was not created by the logged in user and navigate to planning area', async () => {
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

  it('should return true if the draft was created by the logged in user', async () => {
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
    mockScenarioResource$.next({ isLoading: true });
    createComp();
    const spinner =
      fixture.debugElement.nativeElement.querySelector('mat-spinner');
    expect(spinner).toBeTruthy();
  });

  it('should show app-scenario-creation when scenario is DRAFT and user is owner', async () => {
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
