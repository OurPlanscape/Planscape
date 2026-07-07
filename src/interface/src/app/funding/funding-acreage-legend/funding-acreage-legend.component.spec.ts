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
    selectedAcres: 100,
    treatmentAcresTotals: [],
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
});
