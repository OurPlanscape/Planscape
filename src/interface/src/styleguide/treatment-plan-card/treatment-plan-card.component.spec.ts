import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentPlanCardComponent } from './treatment-plan-card.component';
import { ActivatedRoute, RouterLink } from '@angular/router';

describe('TreatmentCardComponent', () => {
  let component: TreatmentPlanCardComponent;
  let fixture: ComponentFixture<TreatmentPlanCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterLink, TreatmentPlanCardComponent],
      providers: [{ provide: ActivatedRoute, useValue: { firstChild: {} } }],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentPlanCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
