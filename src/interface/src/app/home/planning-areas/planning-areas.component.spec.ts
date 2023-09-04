import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningAreasComponent } from './planning-areas.component';
import { MaterialModule } from '../../material/material.module';

describe('PlanningAreasComponent', () => {
  let component: PlanningAreasComponent;
  let fixture: ComponentFixture<PlanningAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PlanningAreasComponent],
      imports: [MaterialModule],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
