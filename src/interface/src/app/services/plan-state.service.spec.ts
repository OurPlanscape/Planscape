import { TestBed } from '@angular/core/testing';

import { PlanStateService } from './plan-state.service';
import { PlanService } from './plan.service';
import { ScenarioService } from './scenario.service';
import { TreatmentGoalsService } from './treatment-goals.service';
import { of } from 'rxjs';

describe('PlanStateService', () => {
  let service: PlanStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PlanService, useValue: {} },
        { provide: ScenarioService, useValue: {} },
        {
          provide: TreatmentGoalsService,
          useValue: { getTreatmentGoalsForArea: () => of([]) },
        },
      ],
    });
    service = TestBed.inject(PlanStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
