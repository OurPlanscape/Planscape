import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  concat,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import {
  ButtonComponent,
  EmptyStateComponent,
  OverlayLoaderComponent,
  WorkspaceCardComponent,
} from '@styleguide';
import { WorkspacesService } from '@services';
import { LoadedResult, Resource, Workspace } from '@types';
import { WorkspaceCreationService } from './workspace-creation.service';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [
    AsyncPipe,
    ButtonComponent,
    EmptyStateComponent,
    NgFor,
    NgIf,
    OverlayLoaderComponent,
    WorkspaceCardComponent,
  ],
  templateUrl: './workspaces.component.html',
  styleUrl: './workspaces.component.scss',
})
export class WorkspacesComponent {
  private workspaceCreationService = inject(WorkspaceCreationService);
  private workspacesService = inject(WorkspacesService);
  private router = inject(Router);

  private reload$ = new BehaviorSubject<void>(undefined);

  private workspacesResource$: Observable<Resource<Workspace[]>> =
    this.reload$.pipe(
      switchMap(() =>
        concat(
          of({ isLoading: true } as Resource<Workspace[]>),
          this.workspacesService.listWorkspaces().pipe(
            map(
              (page) =>
                ({
                  data: page.results,
                  isLoading: false,
                }) as LoadedResult<Workspace[]>
            ),
            catchError((error) => of({ isLoading: false, error }))
          )
        )
      ),
      shareReplay(1)
    );

  isLoading$ = this.workspacesResource$.pipe(map((r) => r.isLoading));
  hasError$ = this.workspacesResource$.pipe(map((r) => !!r.error));
  workspaces$ = this.workspacesResource$.pipe(map((r) => r.data));

  createWorkspace() {
    this.workspaceCreationService
      .openCreateWorkspaceModal('empty-state')
      .subscribe((workspace) => {
        if (workspace) {
          this.reload$.next();
        }
      });
  }

  goToWorkspace(workspace: Workspace) {
    this.router.navigate(['/workspace', workspace.id]);
  }

  can(workspace: Workspace, permission: string): boolean {
    return workspace.permissions.includes(permission);
  }

  trackById(_index: number, workspace: Workspace) {
    return workspace.id;
  }

  retry() {
    this.reload$.next();
  }
}
