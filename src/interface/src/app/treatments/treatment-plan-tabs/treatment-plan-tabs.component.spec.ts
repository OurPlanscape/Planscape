import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentPlanTabsComponent } from './treatment-plan-tabs.component';

describe('TreatmentPlanTabsComponent', () => {
  let component: TreatmentPlanTabsComponent;
  let fixture: ComponentFixture<TreatmentPlanTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentPlanTabsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreatmentPlanTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
