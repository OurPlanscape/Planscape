import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspacesService } from '@services';
import { OverlayLoaderComponent } from '@styleguide';
import { catchError, of } from 'rxjs';

/**
 * Landing page for workspace invite emails. Accepts the requester's pending
 * invite, then opens the workspace.
 */
@Component({
  selector: 'app-accept-workspace-invite',
  standalone: true,
  imports: [OverlayLoaderComponent],
  template: '<sg-overlay-loader></sg-overlay-loader>',
})
export class AcceptWorkspaceInviteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workspacesService = inject(WorkspacesService);

  ngOnInit(): void {
    const workspaceId = Number(this.route.snapshot.paramMap.get('workspaceId'));

    this.workspacesService
      .acceptInvite(workspaceId)
      // Without a pending invite (e.g. it was already accepted) we still open
      // the workspace, the dashboard handles users without access.
      .pipe(catchError(() => of(null)))
      .subscribe(() =>
        this.router.navigate(['/workspace', workspaceId], { replaceUrl: true })
      );
  }
}
