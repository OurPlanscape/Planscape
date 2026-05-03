import { TestBed } from '@angular/core/testing';

import { DataLayersStateService } from './data-layers.state.service';
import { MockProvider } from 'ng-mocks';
import { DatalayersService } from '@api/datalayers/datalayers.service';
import { DatasetsService } from '@api/datasets/datasets.service';
import { of } from 'rxjs';

import { MapModuleService } from '@services/map-module.service';
import { FeaturesModule } from '@features/features.module';
import { PlanState } from '@plan/plan.state';
import { MOCK_GEOMETRY, MOCK_PLAN } from '@services/mocks';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('DataLayersStateService', () => {
  let service: DataLayersStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FeaturesModule, MatSnackBarModule],
      providers: [
        MockProvider(DatalayersService),
        MockProvider(DatasetsService),
        DataLayersStateService,
        MockProvider(MapModuleService, {
          datasets$: of({
            main_datasets: [],
            base_datasets: [],
          }),
        }),
        MockProvider(PlanState, {
          currentPlan$: of(MOCK_PLAN),
          currentPlanId$: of(123),
          planningAreaGeometry$: of(MOCK_GEOMETRY),
        }),
      ],
    });
    service = TestBed.inject(DataLayersStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
