import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentEffectsComponent } from './treatment-effects-home.component';

describe('TreatmentEffectsComponent', () => {
  let component: TreatmentEffectsComponent;
  let fixture: ComponentFixture<TreatmentEffectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentEffectsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreatmentEffectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
