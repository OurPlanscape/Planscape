import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentEffectsHomeComponent } from './treatment-effects-home.component';

describe('TreatmentEffectsHomeComponent', () => {
  let component: TreatmentEffectsHomeComponent;
  let fixture: ComponentFixture<TreatmentEffectsHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentEffectsHomeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreatmentEffectsHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
