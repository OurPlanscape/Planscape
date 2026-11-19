import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, map } from 'rxjs';
import { AuthService, WebSocketService } from '@services';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { DATALAYER_STATUS_EVENT, DataLayerUploadPayload } from '@types';

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

  start(): void {
    this.webSocketService
      .on<DataLayerUploadPayload>(DATALAYER_STATUS_EVENT)
      .pipe(
        map((event) => event.data),
        filter(
          (upload): upload is DataLayerUploadPayload =>
            !!upload && upload.created_by === this.authService.currentUser()?.id
        )
      )
      .subscribe((upload) => {
        if (upload.status === 'READY') {
          this.snackBar.open(
            `"${upload.name}" is ready. Find it in the Uploaded tab.`,
            'Dismiss',
            SNACK_NOTICE_CONFIG
          );
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
}
