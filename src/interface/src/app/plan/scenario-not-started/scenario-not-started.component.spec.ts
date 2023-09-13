import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioNotStartedComponent } from './scenario-not-started.component';

describe('ScenarioNotStartedComponent', () => {
  let component: ScenarioNotStartedComponent;
  let fixture: ComponentFixture<ScenarioNotStartedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScenarioNotStartedComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScenarioNotStartedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
