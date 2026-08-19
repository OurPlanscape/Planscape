import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  FundingAcreageLegendComponent,
  FundingLegendData,
} from './funding-acreage-legend.component';
import { MockProvider } from 'ng-mocks';
import { FundingMapConfigState } from '../funding-map-config-state';
import { of } from 'rxjs';

describe('FundingAcreageLegendComponent', () => {
  let component: FundingAcreageLegendComponent;
  let fixture: ComponentFixture<FundingAcreageLegendComponent>;

  let testLegendData: FundingLegendData = {
    totalPlanningAreaAcres: 119049,
    selectedAcres: 100,
    treatmentAcresTotals: [],
    noTreatmentAcres: 0,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FundingAcreageLegendComponent],
      providers: [
        MockProvider(FundingMapConfigState, { selectedProjectAreas$: of([]) }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FundingAcreageLegendComponent);
    component = fixture.componentInstance;
    component.legendData = testLegendData;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the total planning area acres from the legend data', () => {
    expect(fixture.nativeElement.textContent).toContain('119,049 acres');
  });

  it('should omit the acreage line when the report has no planning area acres', () => {
    component.legendData = { ...testLegendData, totalPlanningAreaAcres: null };
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Total Planning Area Acres'
    );
    expect(fixture.nativeElement.textContent).not.toContain('119,049 acres');
  });
});
