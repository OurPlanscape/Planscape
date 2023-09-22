import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioResultsComponent } from './scenario-results.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('ScenarioResultsComponent', () => {
  let component: ScenarioResultsComponent;
  let fixture: ComponentFixture<ScenarioResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ScenarioResultsComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
