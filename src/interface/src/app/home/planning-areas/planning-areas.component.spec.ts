import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningAreasComponent } from './planning-areas.component';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('PlanningAreasComponent', () => {
  let component: PlanningAreasComponent;
  let fixture: ComponentFixture<PlanningAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PlanningAreasComponent],
      imports: [LegacyMaterialModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
