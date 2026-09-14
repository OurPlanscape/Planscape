import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { WorkspacesService } from '@services';
import { WorkspaceMember } from '@types';
import { of, throwError } from 'rxjs';
import { AcceptWorkspaceInviteComponent } from './accept-workspace-invite.component';

describe('AcceptWorkspaceInviteComponent', () => {
  let workspacesService: jasmine.SpyObj<WorkspacesService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    workspacesService = jasmine.createSpyObj<WorkspacesService>(
      'WorkspacesService',
      ['acceptInvite']
    );
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [AcceptWorkspaceInviteComponent],
      providers: [
        { provide: WorkspacesService, useValue: workspacesService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ workspaceId: '7' }) },
          },
        },
      ],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(AcceptWorkspaceInviteComponent);
    fixture.detectChanges();
  }

  it('accepts the invite and opens the workspace', () => {
    workspacesService.acceptInvite.and.returnValue(of({} as WorkspaceMember));

    createComponent();

    expect(workspacesService.acceptInvite).toHaveBeenCalledOnceWith(7);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/workspace', 7], {
      replaceUrl: true,
    });
  });

  it('opens the workspace when there is no pending invite', () => {
    workspacesService.acceptInvite.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );

    createComponent();

    expect(router.navigate).toHaveBeenCalledOnceWith(['/workspace', 7], {
      replaceUrl: true,
    });
  });
});
