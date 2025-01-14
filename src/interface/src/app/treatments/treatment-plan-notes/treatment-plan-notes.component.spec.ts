import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentPlanNotesComponent } from './treatment-plan-notes.component';

describe('TreatmentPlanNotesComponent', () => {
  let component: TreatmentPlanNotesComponent;
  let fixture: ComponentFixture<TreatmentPlanNotesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentPlanNotesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentPlanNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
