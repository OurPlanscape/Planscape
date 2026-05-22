import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FundingReportComponent } from './funding-report.component';

describe('FundingReportComponent', () => {
  let component: FundingReportComponent;
  let fixture: ComponentFixture<FundingReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FundingReportComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FundingReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
