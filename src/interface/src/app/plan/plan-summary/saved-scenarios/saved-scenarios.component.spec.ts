import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  flush,
  TestBed,
  tick,
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { LegacyMaterialModule } from '../../../material/legacy-material.module';
import { SavedScenariosComponent } from './saved-scenarios.component';
import { POLLING_INTERVAL } from '../../plan-helpers';
import { By } from '@angular/platform-browser';
import {
  CurrencyInKPipe,
  SectionLoaderComponent,
  TypeSafeMatCellDef,
} from '@shared';
import { CurrencyPipe } from '@angular/common';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatDialogModule } from '@angular/material/dialog';

import { AuthService, ScenarioService } from '@services';
import { MockComponent, MockProvider } from 'ng-mocks';
import { FeaturesModule } from '../../../features/features.module';
import { MOCK_PLAN } from '@services/mocks';
import { ScenariosTableListComponent } from '../scenarios-table-list/scenarios-table-list.component';
import { ButtonComponent } from '@styleguide';
import { MatTabsModule } from '@angular/material/tabs';

describe('SavedScenariosComponent', () => {
  let component: SavedScenariosComponent;
  let fixture: ComponentFixture<SavedScenariosComponent>;
  let fakeScenarioService: ScenarioService;

  beforeEach(async () => {
    const fakeRoute = jasmine.createSpyObj(
      'ActivatedRoute',
      {},
      {
        snapshot: {
          paramMap: convertToParamMap({ id: '24' }),
        },
      }
    );

    fakeScenarioService = jasmine.createSpyObj<ScenarioService>(
      'ScenarioService',
      {
        getScenariosForPlan: of([
          {
            id: '1',
            name: 'name',
            planning_area: '1',
            createdTimestamp: 100,
            configuration: {
              id: 1,
              max_budget: 200,
            },
            status: 'ACTIVE',
          },
        ]),
      },
      {}
    );

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        HttpClientTestingModule,
        LegacyMaterialModule,
        MatTableModule,
        MatDialogModule,
        NoopAnimationsModule,
        FeaturesModule,
        ButtonComponent,
        MatTabsModule,
      ],
      declarations: [
        SavedScenariosComponent,
        CurrencyInKPipe,
        TypeSafeMatCellDef,
        MockComponent(SectionLoaderComponent),
        MockComponent(ScenariosTableListComponent),
      ],
      providers: [
        CurrencyPipe,
        MockProvider(AuthService),
        { provide: ActivatedRoute, useValue: fakeRoute },
        { provide: ScenarioService, useValue: fakeScenarioService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SavedScenariosComponent);
    component = fixture.componentInstance;

    component.plan = { ...MOCK_PLAN, permissions: ['add_scenario'], user: 1 };
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should call service for list of scenarios', () => {
    fixture.detectChanges();
    expect(fakeScenarioService.getScenariosForPlan).toHaveBeenCalledOnceWith(
      1,
      '-created_at'
    );
    expect(component.activeScenarios.length).toEqual(1);
  });

  it('clicking new configuration button should call service and navigate', fakeAsync(async () => {
    const route = fixture.debugElement.injector.get(ActivatedRoute);
    const router = fixture.debugElement.injector.get(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();

    const button = fixture.debugElement.query(
      By.css('[data-id="new-scenario"]')
    );
    button.nativeElement.click();
    expect(router.navigate).toHaveBeenCalledOnceWith(['config', ''], {
      relativeTo: route,
    });
    flush();
    discardPeriodicTasks();
  }));

  it('should poll for changes', fakeAsync(() => {
    spyOn(component, 'fetchScenarios');
    fixture.detectChanges();
    expect(component.fetchScenarios).toHaveBeenCalledTimes(1);
    tick(POLLING_INTERVAL);
    fixture.detectChanges();
    expect(component.fetchScenarios).toHaveBeenCalledTimes(2);
    discardPeriodicTasks();
  }));

  it('should show New Scenario button with add_scenario permission', () => {
    component.plan!.permissions = ['add_scenario', 'something_else'];
    fixture.detectChanges();
    const newScenarioButton = fixture.debugElement.query(
      By.css('[data-id="new-scenario"]')
    );
    expect(newScenarioButton).not.toBeNull();
  });

  it('should hide New Scenario button without add_scenario permission', () => {
    component.plan!.permissions = ['nothing_here'];
    fixture.detectChanges();
    const newScenarioButton = fixture.debugElement.query(
      By.css('[data-id="new-scenario"]')
    );
    expect(newScenarioButton).toBeNull();
  });
});
