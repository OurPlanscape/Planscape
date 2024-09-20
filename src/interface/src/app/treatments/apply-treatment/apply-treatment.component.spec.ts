import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplyTreatmentComponent } from './apply-treatment.component';

describe('ApplyTreatmentComponent', () => {
  let component: ApplyTreatmentComponent;
  let fixture: ComponentFixture<ApplyTreatmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplyTreatmentComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplyTreatmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
