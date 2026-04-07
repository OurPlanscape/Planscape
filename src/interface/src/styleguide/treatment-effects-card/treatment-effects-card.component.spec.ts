import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentEffectsCardComponent } from './treatment-effects-card.component';

describe('TreatmentCardComponent', () => {
  let component: TreatmentEffectsCardComponent;
  let fixture: ComponentFixture<TreatmentEffectsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentEffectsCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentEffectsCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
