import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentOverviewComponent } from './treatment-overview.component';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { RouterTestingModule } from '@angular/router/testing';
import { TreatmentsState } from '../treatments.state';
import { TreatmentSummaryComponent } from '../treatment-summary/treatment-summary.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';

describe('TreatmentOverviewComponent', () => {
  let component: TreatmentOverviewComponent;
  let fixture: ComponentFixture<TreatmentOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentOverviewComponent, RouterTestingModule],
      declarations: [
        MockDeclarations(TreatmentSummaryComponent, MapBaseLayerComponent),
      ],
      providers: [MockProviders(TreatmentsState)],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
