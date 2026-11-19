import { Component, OnDestroy, inject } from '@angular/core';
import { DecimalPipe, NgIf, PercentPipe } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FileUploadFieldComponent,
  InputDirective,
  InputFieldComponent,
  ModalComponent,
  ModalInfoComponent,
} from '@styleguide';
import {
  MimeType,
  UploadStatus,
} from '@styleguide/file-upload-field/file-upload-field.component';
import { ConfirmationDialogComponent } from '@standalone/confirmation-dialog/confirmation-dialog.component';
import { WorkspaceDataLayersService } from '@services/workspace-data-layers.service';
import { WorkspaceDataLayer } from '@types';
import { EMPTY, filter, merge, Subscription, switchMap, tap } from 'rxjs';

export interface UploadDataLayerData {
  workspaceId: number;
}

export const MAX_UPLOAD_BYTES = 2 * 1024 ** 3;

const SUPPORTED_TYPES: MimeType[] = [
  { mime: 'image/tiff', suffix: 'tif' },
  { mime: 'image/tiff', suffix: 'tiff' },
];

@Component({
  selector: 'app-upload-data-layer',
  standalone: true,
  imports: [
    NgIf,
    DecimalPipe,
    PercentPipe,
    ReactiveFormsModule,
    MatDialogModule,
    ModalComponent,
    ModalInfoComponent,
    FileUploadFieldComponent,
    InputFieldComponent,
    InputDirective,
  ],
  templateUrl: './upload-data-layer.component.html',
  styleUrl: './upload-data-layer.component.scss',
})
export class UploadDataLayerComponent implements OnDestroy {
  readonly supportedTypes = SUPPORTED_TYPES;

  readonly data = inject<UploadDataLayerData>(MAT_DIALOG_DATA);
  readonly dialogRef =
    inject<MatDialogRef<UploadDataLayerComponent, WorkspaceDataLayer>>(
      MatDialogRef
    );
  private dialog = inject(MatDialog);
  private workspaceDataLayersService = inject(WorkspaceDataLayersService);

  form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
  });

  file: File | null = null;
  fileStatus: UploadStatus = 'default';
  error: string | null = null;
  uploading = false;
  progress = 0;

  private suggestedName = '';
  private pendingLayer: WorkspaceDataLayer | null = null;
  private cancelled = false;
  private upload?: Subscription;
  private confirmRef?: MatDialogRef<ConfirmationDialogComponent, boolean>;

  constructor() {
    // Backdrop and Escape must go through the "Cancel upload?" check
    this.dialogRef.disableClose = true;
    merge(
      this.dialogRef.backdropClick(),
      this.dialogRef
        .keydownEvents()
        .pipe(filter((event) => event.key === 'Escape'))
    ).subscribe(() => this.close());
  }

  get canSubmit() {
    return !!this.file && this.form.valid && !this.uploading;
  }

  handleFile(file: File | undefined) {
    this.error = null;
    this.file = null;
    if (!file) {
      this.fileStatus = 'default';
      return;
    }
    const problem = fileProblem(file);
    if (problem) {
      this.fileStatus = 'failed';
      this.error = problem;
      return;
    }
    this.file = file;
    this.fileStatus = 'uploaded';
    const name = this.form.controls.name;
    if (!name.value.trim() || name.value === this.suggestedName) {
      this.suggestedName = nameFromFile(file.name);
      name.setValue(this.suggestedName);
    }
  }

  submit() {
    const file = this.file;
    if (!file || !this.canSubmit) {
      return;
    }
    this.error = null;
    this.cancelled = false;
    this.uploading = true;
    this.progress = 0;
    this.form.disable();

    this.upload = this.workspaceDataLayersService
      .createUpload(this.data.workspaceId, {
        name: this.form.getRawValue().name.trim(),
        original_name: file.name,
        size: file.size,
      })
      .pipe(
        tap(({ datalayer }) => (this.pendingLayer = datalayer)),
        switchMap(({ upload_to }) => {
          if (this.cancelled) {
            this.discardPendingLayer();
            return EMPTY;
          }
          return this.workspaceDataLayersService.uploadFile(
            upload_to.url,
            file
          );
        })
      )
      .subscribe({
        next: (progress) => (this.progress = progress),
        error: (error: HttpErrorResponse) =>
          this.cancelled ? undefined : this.handleError(error),
        complete: () => (this.cancelled ? undefined : this.finish()),
      });
  }

  close() {
    if (!this.uploading) {
      this.dialogRef.close();
      return;
    }
    if (this.confirmRef) {
      return;
    }
    this.confirmRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Cancel upload?',
        body: "The file hasn't finished uploading. If you cancel, the layer won't be added.",
        primaryCta: 'Cancel upload',
        secondaryCta: 'Keep uploading',
      },
    });
    this.confirmRef.afterClosed().subscribe((confirmed) => {
      this.confirmRef = undefined;
      if (confirmed && this.uploading) {
        this.cancelUpload();
        this.dialogRef.close();
      }
    });
  }

  ngOnDestroy() {
    if (this.uploading) {
      this.cancelUpload();
    }
    this.confirmRef?.close();
  }

  private finish() {
    const layer = this.pendingLayer ?? undefined;
    this.pendingLayer = null;
    this.uploading = false;
    this.confirmRef?.close();
    this.dialogRef.close(layer);
  }

  private cancelUpload() {
    this.cancelled = true;
    this.uploading = false;
    // While the layer is still being created, aborting the request could
    // leave it behind on the server; let it finish and discard it then.
    if (this.pendingLayer) {
      this.upload?.unsubscribe();
      this.discardPendingLayer();
    }
  }

  private handleError(error: HttpErrorResponse) {
    const uploadStarted = !!this.pendingLayer;
    this.discardPendingLayer();
    this.uploading = false;
    this.progress = 0;
    this.form.enable();
    this.error = errorMessage(error, uploadStarted);
  }

  // Without this the PENDING layer would hold on to its name until it expires
  private discardPendingLayer() {
    if (!this.pendingLayer) {
      return;
    }
    this.workspaceDataLayersService
      .deleteDataLayer(this.data.workspaceId, this.pendingLayer.id)
      .subscribe({ error: () => undefined });
    this.pendingLayer = null;
  }
}

export function nameFromFile(fileName: string) {
  return fileName
    .replace(/\.tiff?$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

function fileProblem(file: File): string | null {
  if (!/\.tiff?$/i.test(file.name)) {
    return 'Only GeoTIFF files (.tif, .tiff) are supported.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'The file is larger than the 2 GB limit.';
  }
  return null;
}

function errorMessage(error: HttpErrorResponse, uploadStarted: boolean) {
  if (uploadStarted) {
    return 'The upload failed. Check your connection and try again.';
  }
  const fieldErrors = error.error?.errors;
  if (error.status === 400 && fieldErrors) {
    const first = Object.values(fieldErrors).flat()[0];
    if (typeof first === 'string') {
      return first;
    }
  }
  if (error.status === 501) {
    return "Uploads aren't available in this environment.";
  }
  return "Couldn't start the upload. Please try again.";
}
