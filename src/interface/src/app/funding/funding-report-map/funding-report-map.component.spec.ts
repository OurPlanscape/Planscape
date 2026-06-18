import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundingReportMapComponent } from './funding-report-map.component';
import { MockProvider } from 'ng-mocks';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { of } from 'rxjs';

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
      providers: [MockProvider(DataLayersStateService, {
        dataTree$: of(null),
        paths$: of([]),
      })
        , MockProvider(MapConfigState),
      MockProvider(MapConfigService)],
    }).compileComponents();

    fixture = TestBed.createComponent(FundingReportMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
