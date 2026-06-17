import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundingReportMapComponent } from './funding-report-map.component';
import { MockProvider } from 'ng-mocks';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';

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
      providers: [MockProvider(MapConfigState), MockProvider(MapConfigService)],
    }).compileComponents();

    fixture = TestBed.createComponent(FundingReportMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
