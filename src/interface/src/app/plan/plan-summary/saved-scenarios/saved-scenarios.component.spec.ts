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
import { MaterialModule } from 'src/app/material/material.module';
import { SavedScenariosComponent } from './saved-scenarios.component';
import { POLLING_INTERVAL } from '../../plan-helpers';
import { By } from '@angular/platform-browser';
import { CurrencyInKPipe } from '../../../pipes/currency-in-k.pipe';
import { CurrencyPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DeleteDialogComponent } from '../../../delete-dialog/delete-dialog.component';
import { TypeSafeMatCellDef } from '../../../shared/type-safe-mat-cell/type-safe-mat-cell-def.directive';
import { ScenarioService } from '../../../services';
import { MockComponent } from 'ng-mocks';
import { SectionLoaderComponent } from '../../../shared/section-loader/section-loader.component';
import { FeaturesModule } from '../../../features/features.module';
import { MOCK_PLAN } from '../../../services/mocks';

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
        deleteScenarios: of(['1']),
      },
      {}
    );

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        HttpClientTestingModule,
        MaterialModule,
        MatTableModule,
        NoopAnimationsModule,
        FeaturesModule,
      ],
      declarations: [
        SavedScenariosComponent,
        CurrencyInKPipe,
        TypeSafeMatCellDef,
        MockComponent(SectionLoaderComponent),
      ],
      providers: [
        CurrencyPipe,

        { provide: ActivatedRoute, useValue: fakeRoute },
        { provide: ScenarioService, useValue: fakeScenarioService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SavedScenariosComponent);
    component = fixture.componentInstance;

    component.plan = MOCK_PLAN;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should call service for list of scenarios', () => {
    fixture.detectChanges();
    expect(fakeScenarioService.getScenariosForPlan).toHaveBeenCalledOnceWith(1);

    expect(component.activeScenarios.length).toEqual(1);
  });

  it('should delete selected scenarios', () => {
    fixture.detectChanges();
    component.highlightedScenarioRow = {
      id: '1',
      name: 'name',
      planning_area: '1',
      configuration: {
        max_budget: 200,
      },
      status: 'ACTIVE',
    };

    const dialog = TestBed.inject(MatDialog);
    spyOn(dialog, 'open').and.returnValue({
      afterClosed: () => of(true),
    } as MatDialogRef<DeleteDialogComponent>);

    component.confirmDeleteScenario();
    fixture.detectChanges();

    expect(fakeScenarioService.deleteScenarios).toHaveBeenCalledOnceWith(['1']);
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
});
