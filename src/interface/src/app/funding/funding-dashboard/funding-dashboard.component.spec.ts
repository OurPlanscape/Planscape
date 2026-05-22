import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundingDashboardComponent } from 'src/app/funding/funding-dashboard/funding-dashboard.component';

describe('FundingDashboardComponent', () => {
  let component: FundingDashboardComponent;
  let fixture: ComponentFixture<FundingDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FundingDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FundingDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
