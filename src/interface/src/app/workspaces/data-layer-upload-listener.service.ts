import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService, WebSocketService } from '@services';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import {
  DATALAYER_STATUS_EVENT,
  DataLayerUploadPayload,
  WorkspaceEvent,
} from '@types';

/**
 * Tells the uploader when their layer finishes processing, wherever they are
 * in the workspace.
 */
@Injectable({
  providedIn: 'root',
})
export class DataLayerUploadListenerService {
  private webSocketService = inject(WebSocketService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  start(): void {
    this.webSocketService
      .on<DataLayerUploadPayload>(DATALAYER_STATUS_EVENT)
      .pipe(
        filter(
          (
            event
          ): event is WorkspaceEvent<DataLayerUploadPayload> &
            Required<Pick<WorkspaceEvent<DataLayerUploadPayload>, 'data'>> =>
            !!event.data &&
            event.data.created_by === this.authService.currentUser()?.id
        )
      )
      .subscribe((event) => {
        const upload = event.data;
        if (upload.status === 'READY') {
          this.showReady(event);
        } else if (upload.status === 'FAILED') {
          const reason = upload.failure_reason
            ? ` ${upload.failure_reason}`
            : '';
          this.snackBar.open(
            `[Error] "${upload.name}" couldn't be processed.${reason}`,
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        }
      });
  }

  private showReady(event: WorkspaceEvent<DataLayerUploadPayload>) {
    const workspaceId = event.workspace_id;
    const layerId = event.object?.id;
    const canLink = workspaceId !== undefined && layerId !== undefined;
    this.snackBar
      .open(
        `"${event.data?.name}" is ready.`,
        canLink ? 'View layer' : 'Dismiss',
        SNACK_NOTICE_CONFIG
      )
      .onAction()
      .pipe(filter(() => canLink))
      .subscribe(() =>
        this.router.navigate(['/workspace', workspaceId, 'datalayers', layerId])
      );
  }
}
