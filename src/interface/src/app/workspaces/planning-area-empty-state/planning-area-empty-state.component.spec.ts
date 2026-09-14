import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningAreaEmptyStateComponent } from './planning-area-empty-state.component';
import { PlanningAreaCreationModalComponent } from '../planning-area-creation-modal/planning-area-creation-modal.component';
import { MockDeclaration } from 'ng-mocks';
import { ActivatedRoute, Router } from '@angular/router';

describe('PlanningAreaEmptyStateComponent', () => {
  let component: PlanningAreaEmptyStateComponent;
  let fixture: ComponentFixture<PlanningAreaEmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningAreaEmptyStateComponent],
      declarations: [MockDeclaration(PlanningAreaCreationModalComponent)],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {
                workspaceId: 1,
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningAreaEmptyStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('handleDraw', () => {
    it('navigates to the workspace map viewer in draw mode', () => {
      const navigateSpy = spyOn(TestBed.inject(Router), 'navigate');

      component.handleDraw();

      expect(navigateSpy).toHaveBeenCalledWith(['/map-viewer/workspace', 1], {
        state: { drawPlanningArea: true },
      });
    });
  });
});
