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
export interface DialogData {
  planning_area_name: string;
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

  readonly FormMessageType = FormMessageType;
  readonly dialogRef = inject(MatDialogRef<UploadProjectAreasModalComponent>);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);

  constructor(private fb: FormBuilder) {
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

  closeModal(): void {
    this.dialogRef.close();
  }

  handleCreateForm() {
    console.log('form:', this.uploadProjectsForm);
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

      console.log('here is the formdata now:', formData);
    } else {
      this.uploadStatus = 'failed';
      this.uploadError = 'A file was not uploaded.';
    }

    // TODO: upon submission -- handle the following errors:
    //  - files in zip are not in the right format
    //  - project area not within the planning areas
    //  - something else...
  }
}
