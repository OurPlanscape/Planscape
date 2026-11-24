import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  filter,
  map,
  merge,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import {
  ButtonComponent,
  EmptyStateComponent,
  OverlayLoaderComponent,
  PaginatorComponent,
  StatusChipComponent,
} from '@styleguide';
import { StatusChipStatus } from '@styleguide/status-chip/status-chip.component';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { ResourceUnavailableComponent } from '@app/shared/resource-unavailable/resource-unavailable.component';
import { ConfirmationDialogComponent } from '@standalone/confirmation-dialog/confirmation-dialog.component';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { AuthService, WebSocketService } from '@app/services';
import { WorkspaceDataLayersService } from '@services/workspace-data-layers.service';
import { FeatureService } from '@features/feature.service';
import { SNACK_ERROR_CONFIG } from '@shared';
import {
  DATALAYER_UPLOAD_EVENTS,
  Workspace,
  WorkspaceDataLayer,
  WorkspaceDataLayerStatus,
} from '@types';
import {
  UploadDataLayerComponent,
  UploadDataLayerData,
} from '@data-layers/upload-data-layer/upload-data-layer.component';
import { ActiveUploadsService } from '@data-layers/upload-data-layer/active-uploads.service';
import { WorkspaceState } from '../workspace.state';
import { canManageDataLayers } from '../data-layer-access';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

export const DATA_LAYERS_PAGE_SIZE = 20;

const STATUS_CHIPS: Record<
  WorkspaceDataLayerStatus,
  { status: StatusChipStatus; label: string }
> = {
  PENDING: { status: 'inProgress', label: 'Uploading' },
  PROCESSING: { status: 'inProgress', label: 'Processing' },
  READY: { status: 'success', label: 'Ready' },
  FAILED: { status: 'failed', label: 'Failed' },
};

const INTERRUPTED_CHIP = {
  status: 'failed' as StatusChipStatus,
  label: 'Upload interrupted',
};

@UntilDestroy()
@Component({
  selector: 'app-workspace-data-layers',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    NgFor,
    NgIf,
    RouterLink,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    ButtonComponent,
    EmptyStateComponent,
    OverlayLoaderComponent,
    PaginatorComponent,
    StatusChipComponent,
    NavBarComponent,
    ResourceUnavailableComponent,
  ],
  templateUrl: './workspace-data-layers.component.html',
  styleUrl: './workspace-data-layers.component.scss',
})
export class WorkspaceDataLayersComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private breadcrumbService = inject(BreadcrumbService);
  private webSocketService = inject(WebSocketService);
  private workspaceState = inject(WorkspaceState);
  private featureService = inject(FeatureService);
  private workspaceDataLayersService = inject(WorkspaceDataLayersService);
  private authService = inject(AuthService);
  private activeUploads = inject(ActiveUploadsService);

  readonly pageSize = DATA_LAYERS_PAGE_SIZE;
  readonly formatFileSize = formatFileSize;
  readonly workspaceId: number = this.route.snapshot.data['workspaceId'];

  currentWorkspace$ = this.workspaceState.currentWorkspace$;
  isWorkspaceLoading$ = this.workspaceState.isWorkspaceLoading$;
  workspaceNotFound$ = this.workspaceState.workspaceNotFound$;

  page$ = new BehaviorSubject(1);
  loadFailed = false;
  private reload$ = new Subject<void>();

  dataLayers$ = combineLatest([
    this.page$,
    merge(
      of(null),
      this.reload$,
      this.webSocketService.workspaceUpdates$(DATALAYER_UPLOAD_EVENTS)
    ),
  ]).pipe(
    switchMap(([page]) =>
      this.workspaceDataLayersService
        .listDataLayers(
          this.workspaceId,
          this.pageSize,
          (page - 1) * this.pageSize
        )
        .pipe(
          tap(() => (this.loadFailed = false)),
          catchError(() => {
            this.loadFailed = true;
            return of(null);
          })
        )
    ),
    filter((result) => {
      // deleting the last row of a page leaves nothing to show on it
      const page = this.page$.value;
      if (result && result.results.length === 0 && page > 1) {
        this.page$.next(page - 1);
        return false;
      }
      return true;
    }),
    map((result) =>
      result
        ? {
            count: result.count,
            pageCount: Math.ceil(result.count / this.pageSize),
            layers: result.results,
          }
        : null
    )
  );

  ngOnInit() {
    this.currentWorkspace$.pipe(untilDestroyed(this)).subscribe((workspace) =>
      this.breadcrumbService.updateBreadCrumb({
        label: workspace.name,
        backUrl: `/workspace/${workspace.id}`,
      })
    );
  }

  canManage(workspace: Workspace) {
    return canManageDataLayers(workspace, this.featureService);
  }

  statusChip(layer: WorkspaceDataLayer) {
    return this.isInterrupted(layer)
      ? INTERRUPTED_CHIP
      : STATUS_CHIPS[layer.status];
  }

  canDelete(layer: WorkspaceDataLayer) {
    return layer.status === 'FAILED' || this.isInterrupted(layer);
  }

  // Your own upload that this tab isn't sending was left behind by a reload
  // or a closed tab. Someone else's could still be uploading.
  private isInterrupted(layer: WorkspaceDataLayer) {
    return (
      layer.status === 'PENDING' &&
      layer.created_by === this.authService.currentUser()?.id &&
      !this.activeUploads.has(layer.id)
    );
  }

  retry() {
    this.loadFailed = false;
    this.reload$.next();
  }

  goToPage(page: number) {
    this.page$.next(page);
  }

  upload() {
    this.dialog
      .open<UploadDataLayerComponent, UploadDataLayerData, WorkspaceDataLayer>(
        UploadDataLayerComponent,
        {
          data: { workspaceId: this.workspaceId },
        }
      )
      .afterClosed()
      .pipe(filter((layer) => !!layer))
      .subscribe(() => {
        this.page$.next(1);
        this.reload$.next();
      });
  }

  delete(layer: WorkspaceDataLayer) {
    this.dialog
      .open(ConfirmationDialogComponent, {
        data: {
          title: 'Delete data layer?',
          body: `<strong>${escapeHtml(layer.name)}</strong> will be removed from this workspace.`,
          primaryCta: 'Delete',
        },
      })
      .afterClosed()
      .pipe(
        filter((confirmed) => !!confirmed),
        switchMap(() =>
          this.workspaceDataLayersService.deleteDataLayer(
            this.workspaceId,
            layer.id
          )
        )
      )
      .subscribe({
        next: () => this.reload$.next(),
        error: () =>
          this.snackBar.open(
            `[Error] Unable to delete "${layer.name}".`,
            'Dismiss',
            SNACK_ERROR_CONFIG
          ),
      });
  }

  trackById(_: number, layer: WorkspaceDataLayer) {
    return layer.id;
  }
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null) {
    return '—';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}

function escapeHtml(text: string) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
