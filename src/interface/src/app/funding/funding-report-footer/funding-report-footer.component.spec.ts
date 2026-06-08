import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundingReportFooterComponent } from './funding-report-footer.component';

describe('FundingReportFooterComponent', () => {
  let component: FundingReportFooterComponent;
  let fixture: ComponentFixture<FundingReportFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FundingReportFooterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FundingReportFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
