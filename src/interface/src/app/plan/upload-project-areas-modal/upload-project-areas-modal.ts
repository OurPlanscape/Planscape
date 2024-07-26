import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import {
  FormGroup,
  FormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ModalComponent } from 'src/styleguide/modal/modal.component';
import { ButtonComponent, InputFieldComponent } from '@styleguide';
import { FileUploadFieldComponent } from '../../../styleguide/file-upload-field/file-upload-field.component';
import { SharedModule } from '../../shared/shared.module';
import { FormMessageType } from '@types';
import { ModalInfoComponent } from '../../../styleguide/modal-info-box/modal-info.component';
export interface DialogData {
  planning_area_name: string;
}

@Component({
  selector: 'app-upload-project-areas-modal',
  templateUrl: './upload-project-areas-modal.html',
  styleUrl: './upload-project-areas-modal.scss',
  standalone: true,
  imports: [
    ButtonComponent,
    FileUploadFieldComponent,
    InputFieldComponent,
    ModalComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    NgIf,
    SharedModule,
    ModalInfoComponent,
  ],
})
export class UploadProjectAreasModalComponent {
  uploadProjectsForm: FormGroup;
  planning_area_name = 'Planning Area';
  uploadError?: string | null =
    'Invalid file format. Please upload again using the following format: DBF, SHP, SHX, CPG, PRJ.';
  readonly FormMessageType = FormMessageType;
  readonly dialogRef = inject(MatDialogRef<UploadProjectAreasModalComponent>);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);

  constructor(private fb: FormBuilder) {
    this.uploadProjectsForm = this.fb.group({
      currentPassword: this.fb.control('', [Validators.required]),
    });
  }

  closeModal(): void {
    this.dialogRef.close();
  }
}
