import { Component, inject } from '@angular/core';
import { ModalComponent } from 'src/styleguide/modal/modal.component';
import { MatButtonModule } from '@angular/material/button';
import { FileUploadFieldComponent } from '../../../styleguide/file-upload-field/file-upload-field.component';
import * as shp from 'shpjs';
import { MatDialogRef } from '@angular/material/dialog';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ButtonComponent,
  InputDirective,
  InputFieldComponent,
} from '@styleguide';

@Component({
  selector: 'app-upload-planning-area-modal',
  standalone: true,
  imports: [
    FileUploadFieldComponent,
    ModalComponent,
    MatButtonModule,
    ButtonComponent,
    FileUploadFieldComponent,
    InputFieldComponent,
    ModalComponent,
    // ModalInfoComponent,
    // MatFormFieldModule,
    // MatInputModule,
    FormsModule,
    MatButtonModule,
    // MatDialogModule,
    // MatSelectModule,
    // MatIconModule,
    // NgIf,
    // SharedModule,
    ReactiveFormsModule,
    // MatLegacyButtonModule,
    // MatLegacyMenuModule,
    InputDirective,
  ],
  templateUrl: './upload-planning-area-modal.component.html',
  styleUrl: './upload-planning-area-modal.component.scss',
})
export class UploadPlanningAreaModalComponent {
  uploadPlanningAreaForm!: FormGroup;

  uploadElementStatus: 'default' | 'failed' | 'running' | 'uploaded' =
    'default';
  file: File | null = null;
  geometries: GeoJSON.GeoJSON | null = null;
  uploadFormError?: string | null = null;
  readonly dialogRef = inject(MatDialogRef<UploadPlanningAreaModalComponent>);

  constructor(private fb: FormBuilder) {
    this.uploadPlanningAreaForm = this.fb.group({
      scenarioName: this.fb.control('', [Validators.required]),
      standSize: this.fb.control('MEDIUM', [Validators.required]),
    });
  }

  handleFileEvent(file: File | undefined): void {
    this.uploadElementStatus = 'running';

    if (file !== undefined) {
      this.uploadElementStatus = 'uploaded';
      this.file = file;
      this.convertToGeoJson(this.file);
    } else {
      // User clicked to remove file
      this.uploadElementStatus = 'default';
      this.file = null;
    }
  }

  saveShape() {
    this.dialogRef.close({ confirmed: true, geometries: this.geometries });
  }

  closeModal(): void {
    this.dialogRef.close({ confirmed: false });
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
        console.log('we have geometries?', this.geometries);
      } else if (Array.isArray(geojson)) {
        this.uploadElementStatus = 'failed';
        this.uploadFormError =
          'The upload contains multiple shapefiles and could not be processed.';
        console.log('we have error??', this.uploadFormError);
      } else {
        //unknown failure
        this.uploadElementStatus = 'failed';
        this.uploadFormError = 'The file cannot be converted to GeoJSON.';
        console.log('we have error??', this.uploadFormError);
      }
    } catch (e) {
      this.uploadElementStatus = 'failed';
      this.uploadFormError =
        'The zip file does not appear to contain a valid shapefile.';
      console.log('we have error??', this.uploadFormError);
    }
  }
}
