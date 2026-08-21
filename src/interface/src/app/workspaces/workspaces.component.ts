import { Component, inject } from '@angular/core';
import { ButtonComponent, EmptyStateComponent } from '@styleguide';
import { WorkspaceCreationService } from './workspace-creation.service';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [ButtonComponent, EmptyStateComponent],
  templateUrl: './workspaces.component.html',
  styleUrl: './workspaces.component.scss',
})
export class WorkspacesComponent {
  private workspaceCreationService = inject(WorkspaceCreationService);

  createWorkspace() {
    this.workspaceCreationService
      .openCreateWorkspaceModal('empty-state')
      .subscribe();
  }
}
