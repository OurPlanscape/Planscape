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
import { ModalComponent } from 'src/styleguide/modal/modal.component';
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
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
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

  handleFileEvent(file: File): void {
    this.uploadError = null;

    if (file) {
      console.log('we got a file:', file);
      this.file = file;
      this.uploadProjectsForm.patchValue({ file: file });
    } else {
      this.uploadError = 'Could not upload file.';
    }
  }

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
      this.uploadError = 'A file was not uploaded.';
    }
  }
}
