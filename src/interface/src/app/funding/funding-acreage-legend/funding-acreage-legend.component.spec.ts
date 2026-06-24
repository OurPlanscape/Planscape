import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundingAcreageLegendComponent } from './funding-acreage-legend.component';
import { MockProvider } from 'ng-mocks';
import { FundingMapConfigState } from '../funding-map-config-state';
import { of } from 'rxjs';

describe('FundingAcreageLegendComponent', () => {
  let component: FundingAcreageLegendComponent;
  let fixture: ComponentFixture<FundingAcreageLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FundingAcreageLegendComponent],
      providers: [MockProvider(FundingMapConfigState, { selectedProjectAreas$: of([]) }),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FundingAcreageLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
