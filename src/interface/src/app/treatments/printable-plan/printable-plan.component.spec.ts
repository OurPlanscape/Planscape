import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintablePlanComponent } from './printable-plan.component';

describe('PrintablePlanComponent', () => {
  let component: PrintablePlanComponent;
  let fixture: ComponentFixture<PrintablePlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintablePlanComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PrintablePlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
