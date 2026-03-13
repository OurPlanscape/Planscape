import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningAreaDetailsCardComponent } from './planning-area-details-card.component';

describe('PlanningAreaDetailsCardComponent', () => {
  let component: PlanningAreaDetailsCardComponent;
  let fixture: ComponentFixture<PlanningAreaDetailsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningAreaDetailsCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningAreaDetailsCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
