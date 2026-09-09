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
import { InvalidCoordinatesError } from '@app/services/errors';
import {
  FileUploadFieldComponent,
  InputDirective,
  InputFieldComponent,
  ModalComponent,
  ModalInfoComponent,
} from '@styleguide';
import * as Sentry from '@sentry/browser';
import * as shp from 'shpjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PlanService } from '@app/services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_ERROR_CONFIG } from '@app/shared';
import { ActivatedRoute } from '@angular/router';

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
    if (this.planningAreaForm.valid) {
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
    const reader = new FileReader();
    const fileAsArrayBuffer: ArrayBuffer = await new Promise((resolve) => {
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer);
      };
      reader.readAsArrayBuffer(file);
    });
    try {
      const geojson = (await shp.parseZip(
        fileAsArrayBuffer
      )) as GeoJSON.GeoJSON;
      if (geojson.type == 'FeatureCollection') {
        if (geojson.features.length < 1) {
          throw new InvalidCoordinatesError(
            'Invalid Shapefile: No features were detected in this uploaded shapefile.'
          );
        }
        // cycle through features to find invalid ones...
        geojson.features.map((feature, index) => {
          const geom = feature.geometry;

          if (geom.type === 'LineString' || geom.type === 'Point') {
            throw new InvalidCoordinatesError(
              `Invalid Shapefile: Element at index: ${index} is a ${geom.type}.`
            );
          }

          if (geom.type !== 'GeometryCollection') {
            if (!geom.coordinates || geom.coordinates.length === 0) {
              throw new InvalidCoordinatesError(
                `Invalid Shapefile: Geometry coordinates at feature ${index} are empty.`
              );
            }
          } else {
            if (geom.geometries.length === 0) {
              throw new InvalidCoordinatesError(
                `Invalid Shapefile: GeometryCollection at index ${index} is empty.`
              );
            }
          }
        });

        this.geometry = geojson;
        this.uploadFormError = null;
        this.planningAreaForm.get('file')?.setValue('uploaded');
      } else if (Array.isArray(geojson)) {
        this.uploadFormError =
          'The upload contains multiple shapefiles and could not be processed.';
        this.planningAreaForm.get('file')?.setValue('failed');
      } else {
        //unknown failure
        this.uploadFormError = 'The file cannot be converted to GeoJSON.';
        this.planningAreaForm.get('file')?.setValue('failed');
      }
    } catch (e) {
      this.planningAreaForm.get('file')?.setValue('failed');
      if (e instanceof InvalidCoordinatesError) {
        // Note: here we only display a generic form error, until further discussion w/ Product
        //  but Sentry should catch the detailed message
        this.uploadFormError =
          'The upload contains features with invalid coordinates.';
      } else {
        this.uploadFormError =
          'The zip file does not appear to contain a valid shapefile.';
      }

      Sentry.captureException(e);
    }
  }
}
