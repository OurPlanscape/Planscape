import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundingReportComponent } from './funding-report.component';

describe('FundingReportComponent', () => {
  let component: FundingReportComponent;
  let fixture: ComponentFixture<FundingReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FundingReportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FundingReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
