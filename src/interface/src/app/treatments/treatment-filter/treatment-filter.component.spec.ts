import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentFilterComponent } from './treatment-filter.component';

describe('TreatmentFilterComponent', () => {
  let component: TreatmentFilterComponent;
  let fixture: ComponentFixture<TreatmentFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentFilterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreatmentFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
