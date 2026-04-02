import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentPlanCardsListComponent } from './treatment-plan-cards-list.component';

describe('TreatmentPlanCardsListComponent', () => {
  let component: TreatmentPlanCardsListComponent;
  let fixture: ComponentFixture<TreatmentPlanCardsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentPlanCardsListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreatmentPlanCardsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
