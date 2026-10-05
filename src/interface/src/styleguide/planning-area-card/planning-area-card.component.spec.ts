import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningAreaCardComponent } from './planning-area-card.component';
import { PreviewPlan } from '@app/types';
import { PlanningAreaMenuComponent } from '@app/standalone/planning-area-menu/planning-area-menu.component';
import { MockDeclaration } from 'ng-mocks';

describe('PlanningAreaCardComponent', () => {
  let component: PlanningAreaCardComponent;
  let fixture: ComponentFixture<PlanningAreaCardComponent>;

  let planning: PreviewPlan = {
    area_acres: 12000,
    created_at: '02/02/2026',
    creator: 'Han Solo',
    id: 1,
    name: 'The Falkor 2',
    permissions: [],
    role: '',
    user: 12,
    capabilities: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningAreaCardComponent],
      declarations: [MockDeclaration(PlanningAreaMenuComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningAreaCardComponent);
    component = fixture.componentInstance;
    component.planningArea = planning;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
