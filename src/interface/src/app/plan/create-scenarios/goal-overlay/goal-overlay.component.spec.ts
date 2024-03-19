import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalOverlayComponent } from './goal-overlay.component';

describe('GoalOverlayComponent', () => {
  let component: GoalOverlayComponent;
  let fixture: ComponentFixture<GoalOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GoalOverlayComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoalOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
