import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { DrawService } from '@app/maplibre-map/draw.service';
import {
  FileUploadFieldComponent,
  InputDirective,
  InputFieldComponent,
  ModalComponent,
  ModalInfoComponent,
} from '@styleguide';
import * as Sentry from '@sentry/browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PlanService } from '@app/services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_ERROR_CONFIG } from '@app/shared';
import { ActivatedRoute } from '@angular/router';
import { ShapefileParserService } from '@app/services/shapefile-parser.service';

@Component({
  selector: 'app-planning-area-creation-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalComponent,
    InputFieldComponent,
    MatFormFieldModule,
    FileUploadFieldComponent,
    ModalInfoComponent,
    InputDirective,
  ],
  providers: [DrawService],
  templateUrl: './planning-area-creation-modal.component.html',
  styleUrl: './planning-area-creation-modal.component.scss',
})
export class PlanningAreaCreationModalComponent {
  submitting = false;

  planningAreaForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    file: new FormControl<'default' | 'failed' | 'running' | 'uploaded'>(
      'default',
      [
        Validators.required,
        (control) =>
          control.value === 'uploaded' ? null : { fileNotUploaded: true },
      ]
    ),
  });

  uploadFormError?: string | null = null;

  geometry: any = null;

  private route: ActivatedRoute = inject(ActivatedRoute);
  private shapefileParser = inject(ShapefileParserService);

  workspaceId = this.route.snapshot.data['workspaceId'];

  readonly dialogRef = inject(MatDialogRef<PlanningAreaCreationModalComponent>);

  constructor(
    private planService: PlanService,
    private matSnackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  async handleFileEvent(file: File | undefined) {
    this.planningAreaForm.get('file')?.setValue('running');
    if (file !== undefined) {
      // async:
      this.convertToGeoJson(file);
    } else {
      this.planningAreaForm.get('file')?.setValue('default');
    }
  }

  submit() {
    if (this.planningAreaForm.valid && !this.submitting) {
      this.submitting = true;
      this.uploadFormError = null;
      this.createPlan();
    }
  }

  handleClose() {
    this.dialogRef.close(false);
  }

  private createPlan() {
    if (this.geometry && this.planningAreaForm.valid) {
      this.planService
        .createPlan({
          name: this.planningAreaForm.get('name')?.value!,
          geometry: this.geometry,
          workspace: this.data.workspaceId,
        })
        .subscribe({
          next: () => {
            this.dialogRef.close(true);
            this.submitting = false;
          },
          error: (e) => {
            // Planning area name already exist
            if (e.error.errors?.name?.[0]) {
              this.uploadFormError = e.error.errors?.name?.[0];
            } else {
              this.matSnackBar.open(
                '[Error] Unable to create plan due to backend error.',
                'Dismiss',
                SNACK_ERROR_CONFIG
              );
            }
            this.submitting = false;
          },
        });
    }
  }

  async convertToGeoJson(file: File) {
    try {
      const buffer = await this.shapefileParser.readFileAsArrayBuffer(file);
      const geojson = await this.shapefileParser.parseAndValidate(buffer);

      this.geometry = geojson;
      this.uploadFormError = null;
      this.planningAreaForm.get('file')?.setValue('uploaded');
    } catch (e) {
      this.planningAreaForm.get('file')?.setValue('failed');
      this.uploadFormError = this.shapefileParser.getUserFacingErrorMessage(e);
      Sentry.captureException(e);
    }
  }
}
