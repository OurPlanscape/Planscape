import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { FundingMapConfigState } from '../funding-map-config-state';
import { FundingReportMapComponent } from './funding-report-map.component';

describe('FundingReportMapComponent', () => {
  let component: FundingReportMapComponent;
  let fixture: ComponentFixture<FundingReportMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FundingReportMapComponent,
        HttpClientTestingModule,
        MatSnackBarModule,
      ],
      providers: [
        MockProvider(DataLayersStateService, {
          dataTree$: of(null),
          paths$: of([]),
        }),
        MockProvider(MapConfigState),
        MockProvider(FundingMapConfigState),
        MockProvider(MapConfigService),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FundingReportMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
