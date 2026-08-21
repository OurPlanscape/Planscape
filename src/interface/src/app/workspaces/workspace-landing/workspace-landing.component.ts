import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

/**
 * TODO: placeholder until the real landing page lands (separate task).
 */
@Component({
  selector: 'app-workspace-landing',
  standalone: true,
  imports: [AsyncPipe],
  template: `<p>Workspace {{ workspaceId$ | async }}</p>`,
})
export class WorkspaceLandingComponent {
  private route = inject(ActivatedRoute);

  workspaceId$ = this.route.paramMap.pipe(
    map((params) => params.get('workspaceId'))
  );
}
