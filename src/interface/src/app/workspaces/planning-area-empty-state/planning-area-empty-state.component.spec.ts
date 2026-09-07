import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningAreaEmptyStateComponent } from './planning-area-empty-state.component';

describe('PlanningAreaEmptyStateComponent', () => {
  let component: PlanningAreaEmptyStateComponent;
  let fixture: ComponentFixture<PlanningAreaEmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningAreaEmptyStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningAreaEmptyStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
