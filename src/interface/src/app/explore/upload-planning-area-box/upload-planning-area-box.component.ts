import { Component, EventEmitter, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import * as shp from 'shpjs';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DrawService } from '@app/maplibre-map/draw.service';
import { FileUploadFieldComponent, ModalInfoComponent } from '@styleguide';
import { InvalidCoordinatesError } from '@services/errors';
import * as Sentry from '@sentry/browser';

@Component({
  selector: 'app-upload-planning-area-box',
  standalone: true,
  imports: [
    FileUploadFieldComponent,
    MatButtonModule,
    ModalInfoComponent,
    NgIf,
    FormsModule,
    MatButtonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './upload-planning-area-box.component.html',
  styleUrl: './upload-planning-area-box.component.scss',
})
export class UploadPlanningAreaBoxComponent {
  uploadPlanningAreaForm!: FormGroup;

  uploadElementStatus: 'default' | 'failed' | 'running' | 'uploaded' =
    'default';
  file: File | null = null;
  uploadFormError?: string | null = null;
  @Output() uploadedShape = new EventEmitter();

  constructor(
    private fb: FormBuilder,
    private drawService: DrawService
  ) {
    this.uploadPlanningAreaForm = this.fb.group({
      scenarioName: this.fb.control('', [Validators.required]),
      standSize: this.fb.control('MEDIUM', [Validators.required]),
    });
  }

  handleFileEvent(file: File | undefined): void {
    this.uploadElementStatus = 'running';
    if (file !== undefined) {
      // async:
      this.convertToGeoJson(file);
    } else {
      this.uploadElementStatus = 'default';
      this.file = null;
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
        this.drawService.addUploadedFeatures(geojson);
        this.uploadElementStatus = 'uploaded';
        this.uploadedShape.emit();
      } else if (Array.isArray(geojson)) {
        this.uploadElementStatus = 'failed';
        this.uploadFormError =
          'The upload contains multiple shapefiles and could not be processed.';
      } else {
        //unknown failure
        this.uploadElementStatus = 'failed';
        this.uploadFormError = 'The file cannot be converted to GeoJSON.';
      }
    } catch (e) {
      this.uploadElementStatus = 'failed';
      if (e instanceof InvalidCoordinatesError) {
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
