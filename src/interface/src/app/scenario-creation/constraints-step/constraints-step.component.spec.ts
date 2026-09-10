import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConstraintsStepComponent } from './constraints-step.component';

describe('ConstraintsStepComponent', () => {
  let component: ConstraintsStepComponent;
  let fixture: ComponentFixture<ConstraintsStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConstraintsStepComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ConstraintsStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
