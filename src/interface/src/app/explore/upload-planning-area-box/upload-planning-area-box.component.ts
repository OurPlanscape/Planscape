import { Component, EventEmitter, inject, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DrawService } from '@maplibre-map/draw.service';
import { FileUploadFieldComponent, ModalInfoComponent } from '@styleguide';
import * as Sentry from '@sentry/browser';
import { ShapefileParserService } from '@app/services/shapefile-parser.service';

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

  private shapefileParser = inject(ShapefileParserService);

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
    try {
      const buffer = await this.shapefileParser.readFileAsArrayBuffer(file);
      const geojson = await this.shapefileParser.parseAndValidate(buffer);

      this.drawService.addUploadedFeatures(geojson);
      this.uploadElementStatus = 'uploaded';
      this.uploadedShape.emit();
    } catch (e) {
      this.uploadElementStatus = 'failed';
      this.uploadFormError = this.shapefileParser.getUserFacingErrorMessage(e);
      Sentry.captureException(e);
    }
  }
}
