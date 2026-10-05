import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceDashboardComponent } from './workspace-dashboard.component';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProvider } from 'ng-mocks';
import { WorkspaceActionsService } from '../workspace-actions.service';

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
});
