import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PriorityWeightingComponent } from './priority-weighting.component';

describe('PriorityWeightingComponent', () => {
  let component: PriorityWeightingComponent;
  let fixture: ComponentFixture<PriorityWeightingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriorityWeightingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PriorityWeightingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
