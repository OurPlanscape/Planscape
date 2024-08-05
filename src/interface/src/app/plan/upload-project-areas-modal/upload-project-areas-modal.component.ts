import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import {
  FormGroup,
  FormsModule,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { ModalComponent } from 'src/styleguide/modal/modal.component';
import { ModalInfoComponent } from 'src/styleguide/modal-info-box/modal-info.component';

import { ButtonComponent, InputFieldComponent } from '@styleguide';
import { FileUploadFieldComponent } from '../../../styleguide/file-upload-field/file-upload-field.component';
import { SharedModule } from '../../shared/shared.module';
import { FormMessageType } from '@types';
import { GeoJsonObject } from 'geojson';
import { PlanService } from '@services';
import { take } from 'rxjs';

import * as shp from 'shpjs';

export interface DialogData {
  planning_area_name: string;
  planId: string;
}

@Component({
  selector: 'app-upload-project-areas-modal',
  templateUrl: './upload-project-areas-modal.component.html',
  styleUrl: './upload-project-areas-modal.component.scss',
  standalone: true,
  imports: [
    ButtonComponent,
    FileUploadFieldComponent,
    InputFieldComponent,
    ModalComponent,
    ModalInfoComponent,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatIconModule,
    NgIf,
    SharedModule,
    ReactiveFormsModule,
  ],
})
export class UploadProjectAreasModalComponent {
  uploadProjectsForm: FormGroup;
  planning_area_name = 'Planning Area';
  file: File | null = null;
  uploadStatus: 'default' | 'failed' | 'running' | 'uploaded' = 'default';
  standSize = 'Medium';
  uploadError?: string | null = null;
  alertMessage?: string | null = null;
  geometries: GeoJsonObject | null = null;
  readonly FormMessageType = FormMessageType;
  readonly dialogRef = inject(MatDialogRef<UploadProjectAreasModalComponent>);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);

  constructor(
    private fb: FormBuilder,
    private planService: PlanService
  ) {
    this.uploadProjectsForm = this.fb.group({
      scenarioName: this.fb.control('', [Validators.required]),
      standSize: this.fb.control(''),
    });
  }

  handleFileEvent(file: File | undefined): void {
    this.uploadError = null;
    this.uploadStatus = 'running';

    if (file !== undefined) {
      this.uploadStatus = 'uploaded';
      this.file = file;
      this.uploadProjectsForm.patchValue({ file: file });
      this.convertToGeoJson(this.file);
    } else {
      // User clicked to remove file
      this.uploadStatus = 'default';
      this.file = null;
    }
  }

  canSubmit(): boolean {
    return this.uploadProjectsForm.valid && this.geometries !== null;
  }

  closeModal(): void {
    this.dialogRef.close();
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
        // Note: this has to be set to a value in order for the 'create' button to be enabled
        this.geometries = geojson;
      } else {
        this.uploadError = 'The file cannot be converted to GeoJSON.';
      }
    } catch (e) {
      this.uploadError =
        'The zip file does not appear to contain a valid shapefile.';
    }
  }

  handleCreateButton() {
    if (this.file) {
      const formData = new FormData();
      formData.append('file', this.file, this.file.name);
      formData.append(
        'scenarioName',
        this.uploadProjectsForm.get('scenarioName')?.value
      );
      formData.append(
        'standSize',
        this.uploadProjectsForm.get('standSize')?.value
      );
    } else {
      this.uploadStatus = 'failed';
      this.uploadError = 'A file was not uploaded.';
    }
    this.uploadData();
  }

  uploadData() {
    if (this.geometries !== null) {
      this.planService
        .uploadGeometryForNewScenario(
          this.geometries,
          this.uploadProjectsForm.get('scenarioName')?.value,
          this.uploadProjectsForm.get('standSize')?.value,
          this.data.planId
        )
        .pipe(take(1))
        .subscribe({
          next: (response) => {
            this.dialogRef.close({ response: response });
          },
          error: (err: any) => {
            if (err.error.error !== undefined) {
              this.uploadError = err.error.error;
            } else {
              this.uploadError =
                'An unknown error occured when trying to create a scenario.';
            }
          },
        });
    }
  }
}
