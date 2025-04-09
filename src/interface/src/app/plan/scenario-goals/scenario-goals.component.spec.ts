import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioGoalsComponent } from './scenario-goals.component';

describe('ScenarioGoalsComponent', () => {
  let component: ScenarioGoalsComponent;
  let fixture: ComponentFixture<ScenarioGoalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioGoalsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ScenarioGoalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
