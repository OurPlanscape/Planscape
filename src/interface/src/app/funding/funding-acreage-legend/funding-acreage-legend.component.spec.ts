import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundingAcreageLegendComponent } from './funding-acreage-legend.component';

describe('FundingAcreageLegendComponent', () => {
  let component: FundingAcreageLegendComponent;
  let fixture: ComponentFixture<FundingAcreageLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FundingAcreageLegendComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FundingAcreageLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
