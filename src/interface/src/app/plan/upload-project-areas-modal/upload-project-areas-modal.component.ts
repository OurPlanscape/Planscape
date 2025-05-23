import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
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

import {
  ButtonComponent,
  InputDirective,
  InputFieldComponent,
} from '@styleguide';
import { FileUploadFieldComponent } from '../../../styleguide/file-upload-field/file-upload-field.component';
import { SharedModule } from '../../shared/shared.module';
import { FormMessageType } from '@types';
import { PlanService } from '@services';
import { take } from 'rxjs';

import * as shp from 'shpjs';
import { MatLegacyButtonModule } from '@angular/material/legacy-button';
import { MatLegacyMenuModule } from '@angular/material/legacy-menu';

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
    MatLegacyButtonModule,
    MatLegacyMenuModule,
    InputDirective,
  ],
})
export class UploadProjectAreasModalComponent {
  uploadProjectsForm!: FormGroup;
  planning_area_name = 'Planning Area';
  file: File | null = null;
  uploadElementStatus: 'default' | 'failed' | 'running' | 'uploaded' =
    'default';
  uploadFormError?: string | null = null;
  alertMessage?: string | null = null;
  nameError = '';
  geometries: GeoJSON.GeoJSON | null = null;
  readonly FormMessageType = FormMessageType;
  readonly dialogRef = inject(MatDialogRef<UploadProjectAreasModalComponent>);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);
  uploadingData = false;

  constructor(
    private fb: FormBuilder,
    private planService: PlanService
  ) {
    this.uploadProjectsForm = this.fb.group({
      scenarioName: this.fb.control('', [Validators.required]),
      standSize: this.fb.control('MEDIUM', [Validators.required]),
    });
  }

  handleFileEvent(file: File | undefined): void {
    this.uploadFormError = null;
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
        this.geometries = geojson;
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

  hasNameError() {
    const nameField = this.uploadProjectsForm.get('scenarioName');
    if (nameField) {
      return nameField?.errors !== null && nameField?.touched;
    }
    return false;
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
      this.uploadElementStatus = 'failed';
      this.uploadFormError = 'A file was not uploaded.';
    }
    this.uploadData();
  }

  uploadData() {
    if (this.geometries !== null) {
      this.uploadingData = true;
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
            this.uploadingData = false;
          },
          error: (err: any) => {
            this.uploadingData = false;
            if (!!err.error?.global) {
              this.uploadFormError = err.error.global.join(' ');
            } else if (err.error?.name) {
              const nameControl = this.uploadProjectsForm.get('scenarioName');
              if (err.error.name?.join(' ').includes('blank.')) {
                nameControl?.setErrors({
                  customError: 'Name must not be blank',
                });
              }
              if (err.error.name?.join(' ').includes('name already exists.'))
                nameControl?.setErrors({
                  customError: 'A scenario with this name already exists.',
                });
            } else {
              this.uploadFormError =
                'An unknown error occured when trying to create a scenario.';
            }
          },
        });
    }
  }
}
