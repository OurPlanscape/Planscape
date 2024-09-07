import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentLayoutComponent } from './treatment-layout.component';

describe('TreatmentLayoutComponent', () => {
  let component: TreatmentLayoutComponent;
  let fixture: ComponentFixture<TreatmentLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentLayoutComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreatmentLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
