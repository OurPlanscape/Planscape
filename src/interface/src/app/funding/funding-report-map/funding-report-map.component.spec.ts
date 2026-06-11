import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundingReportMapComponent } from './funding-report-map.component';

describe('FundingReportMapComponent', () => {
  let component: FundingReportMapComponent;
  let fixture: ComponentFixture<FundingReportMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FundingReportMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FundingReportMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
