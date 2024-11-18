import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintableTreatmentComponent } from './printable-treatment.component';

describe('PrintableTreatmentComponent', () => {
  let component: PrintableTreatmentComponent;
  let fixture: ComponentFixture<PrintableTreatmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintableTreatmentComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintableTreatmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
