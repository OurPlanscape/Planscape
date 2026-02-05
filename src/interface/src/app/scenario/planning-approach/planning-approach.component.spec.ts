import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningApproachComponent } from './planning-approach.component';

describe('PlanningApproachComponent', () => {
  let component: PlanningApproachComponent;
  let fixture: ComponentFixture<PlanningApproachComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningApproachComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PlanningApproachComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
