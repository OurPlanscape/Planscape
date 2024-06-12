import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LegacyPlanningAreasComponent } from './legacy-planning-areas.component';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('PlanningAreasComponent', () => {
  let component: LegacyPlanningAreasComponent;
  let fixture: ComponentFixture<LegacyPlanningAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LegacyPlanningAreasComponent],
      imports: [LegacyMaterialModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(LegacyPlanningAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
