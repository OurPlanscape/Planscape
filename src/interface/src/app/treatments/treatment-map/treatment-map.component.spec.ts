import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentMapComponent } from './treatment-map.component';

describe('TreatmentMapComponent', () => {
  let component: TreatmentMapComponent;
  let fixture: ComponentFixture<TreatmentMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
