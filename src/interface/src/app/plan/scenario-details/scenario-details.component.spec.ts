import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioDetailsComponent } from './scenario-details.component';

describe('ScenarioDetailsComponent', () => {
  let component: ScenarioDetailsComponent;
  let fixture: ComponentFixture<ScenarioDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScenarioDetailsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScenarioDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
