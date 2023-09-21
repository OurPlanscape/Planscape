import { ProjectArea } from 'src/app/types';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { SharedModule } from 'src/app/shared/shared.module';
import * as L from 'leaflet';

import { PlanService } from './../../services/plan.service';
import { Scenario } from './../../types';
import { MapLayersComponent } from './map-layers/map-layers.component';
import { ScenarioDetailsComponent } from './scenario-details.component';

describe('ScenarioDetailsComponent', () => {
  let component: ScenarioDetailsComponent;
  let fixture: ComponentFixture<ScenarioDetailsComponent>;
  let fakeService: jasmine.SpyObj<any>;
  let fakeScenario: Scenario;

  beforeEach(async () => {
    const snackbarSpy = jasmine.createSpyObj<MatSnackBar>(
      'MatSnackBar',
      {
        open: undefined,
      },
      {}
    );

    fakeScenario = {
      id: '1',
      name: 'name',
      planning_area: '1',
      configuration: {
        max_budget: 200,
        project_areas: [
          {
            id: '1',
            projectId: '1',
            projectArea: new L.Polygon([
              new L.LatLng(38.715517043571914, -120.42857302225725),
              new L.LatLng(38.47079787227401, -120.5164425608172),
              new L.LatLng(38.52668443555346, -120.11828371421737),
            ]).toGeoJSON(),
            estimatedAreaTreated: 5000,
          },
        ],
      },
    };
    fakeService = jasmine.createSpyObj('PlanService', {
      getScenario: of(fakeScenario),
      updateStateWithShapes: of(),
    });
    fakeService.planState$ = of({ currentScenarioId: 1 });

    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        HttpClientTestingModule,
        MaterialModule,
        ReactiveFormsModule,
        SharedModule,
      ],
      declarations: [ScenarioDetailsComponent, MapLayersComponent],
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

  it('should draw project areas on the map', () => {
    expect(fakeService.updateStateWithShapes).toHaveBeenCalled();
  });
});
