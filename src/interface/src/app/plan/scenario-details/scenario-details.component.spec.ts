import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/app/material/material.module';
import { of } from 'rxjs';

import { PlanService } from './../../services/plan.service';
import { Scenario } from './../../types';
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
    fakeService.planState$ = of({ currentScenarioId: 1 });

    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, HttpClientTestingModule, MaterialModule],
      declarations: [ScenarioDetailsComponent],
      providers: [
        { provide: MatSnackBar, useValue: snackbarSpy },
        { provide: PlanService, useValue: fakeService },
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
