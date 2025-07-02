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
import { MapConfigState } from 'src/app/maplibre-map/map-config.state';
import { DrawService } from 'src/app/maplibre-map/draw.service';
import { FileUploadFieldComponent } from 'src/styleguide/file-upload-field/file-upload-field.component';
import { ModalInfoComponent } from 'src/styleguide/modal-info-box/modal-info.component';

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
  geometries: GeoJSON.GeoJSON | null = null;
  uploadFormError?: string | null = null;
  @Output() uploadedShape = new EventEmitter();

  constructor(
    private fb: FormBuilder,
    private mapConfigState: MapConfigState,
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
      // User clicked to remove file
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
        this.geometries = geojson;
        this.mapConfigState.enterDrawingMode();
        this.drawService.addGeoJSONFeature(this.geometries);
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
      this.uploadFormError =
        'The zip file does not appear to contain a valid shapefile.';
    }
  }
}
