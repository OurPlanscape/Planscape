import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { SharedModule } from 'src/app/shared/shared.module';

import { PlanService } from './../../services/plan.service';
import { Scenario } from './../../types';
import { MapLayersComponent } from './map-layers/map-layers.component';
import { OutcomeComponent } from './outcome/outcome.component';
import { ScenarioDetailsComponent } from './scenario-details.component';

describe('ScenarioDetailsComponent', () => {
  let component: ScenarioDetailsComponent;
  let fixture: ComponentFixture<ScenarioDetailsComponent>;
  let fakeService: jasmine.SpyObj<any>;

  beforeEach(async () => {
    const snackbarSpy = jasmine.createSpyObj<MatSnackBar>(
      'MatSnackBar',
      {
        open: undefined,
      },
      {}
    );

    const fakeScenario: Scenario = {
      id: '1',
    };
    fakeService = jasmine.createSpyObj('PlanService', {
      getScenario: of(fakeScenario),
    });
    fakeService.planState$ = of({ currentScenarioId: 1, panelExpanded: true });

    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        HttpClientTestingModule,
        MaterialModule,
        ReactiveFormsModule,
        SharedModule,
      ],
      declarations: [
        ScenarioDetailsComponent,
        MapLayersComponent,
        OutcomeComponent,
      ],
      providers: [
        { provide: MatSnackBar, useValue: snackbarSpy },
        { provide: PlanService, useValue: fakeService },
        FormBuilder,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getScenario', () => {
    expect(fakeService.getScenario).toHaveBeenCalled();
  });
});
