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

    if (file) {
      this.uploadStatus = 'uploaded';
      this.file = file;
      this.uploadProjectsForm.patchValue({ file: file });
      this.convertToGeoJson(this.file);
    } else if (file === undefined) {
      // User clicked to remove file
      this.uploadStatus = 'default';
      this.file = null;
    } else {
      // Unexpected issue
      this.uploadStatus = 'failed';
      this.uploadError = 'Could not upload file.';
    }
  }

  // TODO: file removal click...
  canSubmit(): boolean {
    return this.uploadProjectsForm.valid && this.geometries !== null;
  }

  closeModal(): void {
    this.dialogRef.close();
  }

  async convertToGeoJson(file: File) {
    const reader = new FileReader();
    //TODO: account for wrong file type, as well as other errors
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
      } else {
        this.uploadError = 'The file cannot be converted to GeoJSON.';
      }
    } catch (e) {
      this.uploadError =
        'The zip file does not appear to contain a valid shapefile.';
    }
  }

  handleCreateForm() {
    if (this.file) {
      const formData = new FormData();

      // Append file data
      formData.append('file', this.file, this.file.name);

      // Append additional form data
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

    // TODO: upon submission -- handle the following errors:
    //  - files in zip are not in the right format
    //  - project area not within the planning areas
    //  - something else...
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
            this.closeModal();
            // TODO: show...some sort of successful feedback?
            //  navigate to the scenario page?
          },
          error: (err: any) => {
            if (err.error) {
              this.uploadError = err.error.error;
            }
          },
        });
    }
  }
}
