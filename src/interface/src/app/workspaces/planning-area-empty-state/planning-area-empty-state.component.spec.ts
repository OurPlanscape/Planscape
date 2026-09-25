import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningAreaEmptyStateComponent } from './planning-area-empty-state.component';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { Workspace } from '@types';
import { WorkspaceState } from '../workspace.state';

describe('PlanningAreaEmptyStateComponent', () => {
  let component: PlanningAreaEmptyStateComponent;
  let fixture: ComponentFixture<PlanningAreaEmptyStateComponent>;
  let currentWorkspace$: BehaviorSubject<Workspace>;

  const workspaceWith = (permissions: string[]) =>
    ({ permissions }) as unknown as Workspace;

  beforeEach(async () => {
    currentWorkspace$ = new BehaviorSubject(
      workspaceWith(['add_planningarea'])
    );

    await TestBed.configureTestingModule({
      imports: [PlanningAreaEmptyStateComponent, MatDialogModule],
      providers: [
        {
          provide: WorkspaceState,
          useValue: { currentWorkspace$ },
        },
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

  it('shows the add actions when the workspace grants the permission', () => {
    expect(fixture.nativeElement.querySelector('.action-row')).not.toBeNull();
  });

  it('shows the awaiting message instead of the add actions when the workspace does not grant them', () => {
    currentWorkspace$.next(workspaceWith(['view_workspace']));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.action-row')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Awaiting planning areas'
    );
  });

  it('does not show the awaiting message when the workspace grants the permission', () => {
    expect(fixture.nativeElement.textContent).not.toContain(
      'Awaiting planning areas'
    );
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
