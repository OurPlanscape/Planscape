import { Component } from '@angular/core';
import { ButtonComponent, EmptyStateComponent } from '@styleguide';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [ButtonComponent, EmptyStateComponent],
  templateUrl: './workspaces.component.html',
  styleUrl: './workspaces.component.scss',
})
export class WorkspacesComponent {
  createWorkspace() {
    // TODO: open the create workspace flow
  }
}
