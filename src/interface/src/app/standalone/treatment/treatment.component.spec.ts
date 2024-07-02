import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentComponent } from './treatment.component';

describe('TreatmentComponent', () => {
  let component: TreatmentComponent;
  let fixture: ComponentFixture<TreatmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreatmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
