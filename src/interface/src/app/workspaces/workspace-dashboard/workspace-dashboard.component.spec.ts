import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceDashboardComponent } from './workspace-dashboard.component';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProvider } from 'ng-mocks';
import { WorkspaceActionsService } from '../workspace-actions.service';
import { FeatureService } from '@app/features/feature.service';
import { Workspace } from '@types';

describe('WorkspaceDashboardComponent', () => {
  let component: WorkspaceDashboardComponent;
  let fixture: ComponentFixture<WorkspaceDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        WorkspaceDashboardComponent,
        HttpClientTestingModule,
        RouterTestingModule,
      ],
      providers: [
        MockProvider(WorkspaceActionsService),
        MockProvider(FeatureService),
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

    fixture = TestBed.createComponent(WorkspaceDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('navigates to the workspace map viewer', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    component.handleNavigation();

    expect(navigateSpy).toHaveBeenCalledWith(['/map-viewer/workspace', 1]);
  });

  it('navigates to the workspace data layers page', () => {
    const navigateSpy = spyOn(TestBed.inject(Router), 'navigate');

    component.goToDataLayers();

    expect(navigateSpy).toHaveBeenCalledWith(['/workspace', 1, 'datalayers']);
  });

  describe('canManageDataLayers', () => {
    const workspace = (permissions: string[]) =>
      ({ permissions }) as unknown as Workspace;

    it('needs DATA_UPLOAD and add_datalayer', () => {
      const features = TestBed.inject(FeatureService);
      spyOn(features, 'isFeatureEnabled').and.returnValue(true);

      expect(component.canManageDataLayers(workspace(['add_datalayer']))).toBe(
        true
      );
      expect(component.canManageDataLayers(workspace(['view_workspace']))).toBe(
        false
      );
    });

    it('is off without DATA_UPLOAD', () => {
      const features = TestBed.inject(FeatureService);
      spyOn(features, 'isFeatureEnabled').and.returnValue(false);

      expect(component.canManageDataLayers(workspace(['add_datalayer']))).toBe(
        false
      );
    });
  });
});
