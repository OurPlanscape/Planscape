import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioPendingComponent } from './scenario-pending.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('ScenarioPendingComponent', () => {
  let component: ScenarioPendingComponent;
  let fixture: ComponentFixture<ScenarioPendingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioPendingComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioPendingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
