import { CommonModule } from '@angular/common';
import { Component, inject, Inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ClimateForesightService } from '@services';
import {
  InputDirective,
  InputFieldComponent,
  ModalComponent,
} from '@styleguide';
import { Pillar } from '@types';

@Component({
  selector: 'app-name-pillar-modal',
  standalone: true,
  imports: [
    CommonModule,
    ModalComponent,
    ReactiveFormsModule,
    InputFieldComponent,
    InputDirective,
    MatFormFieldModule,
  ],
  templateUrl: './name-pillar-modal.component.html',
  styleUrl: './name-pillar-modal.component.scss',
})
export class NamePillarModalComponent implements OnInit {
  form: FormGroup = new FormGroup({
    pillarName: new FormControl(null, [Validators.required]),
  });

  readonly dialogRef = inject(MatDialogRef<NamePillarModalComponent>);
  climateService: ClimateForesightService = inject(ClimateForesightService);

  submitting = false;
  displayError = false;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { pillar: Pillar | null; runId: number }
  ) {}

  ngOnInit(): void {
    if (this.editMode) {
      this.form.get('pillarName')?.setValue(this.data.pillar?.name);
    }
  }

  handleSubmit() {
    if (this.form.valid && !this.submitting) {
      this.submitting = true;
      if (this.editMode) {
        this.edit();
      } else {
        this.create();
      }
    }
  }

  create() {
    if (this.data.runId && this.form.valid) {
      this.climateService
        .createPillar(this.form.getRawValue().pillarName, this.data.runId)
        .subscribe({
          next: () => {
            this.displayError = false;
            this.submitting = false;
            this.dialogRef.close(true);
          },
          error: () => {
            this.submitting = false;
            this.displayError = true;
          },
        });
    }
  }

  edit() {
    if (this.form.valid && this.data.runId && this.data.pillar) {
      this.climateService
        .editPillar(
          this.form.getRawValue().pillarName,
          this.data.pillar.id,
          this.data.runId
        )
        .subscribe({
          next: () => {
            this.submitting = false;
            this.displayError = false;
            this.dialogRef.close(true);
          },
          error: () => {
            this.submitting = false;
            this.displayError = true;
          },
        });
    }
  }

  cancel() {
    this.dialogRef.close(false);
  }

  get editMode(): boolean {
    return !!this.data.pillar;
  }

  get primaryCTA(): string {
    if (this.displayError) {
      return 'Try Again';
    } else if (this.editMode) {
      return 'Done';
    }
    return 'Create';
  }
}
