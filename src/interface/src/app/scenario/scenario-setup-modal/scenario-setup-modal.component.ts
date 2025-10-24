import { Component, inject, Inject } from '@angular/core';
import {
  InputDirective,
  InputFieldComponent,
  ModalComponent,
} from '@styleguide';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_ERROR_CONFIG } from '@shared';
import { ScenarioService } from '@services';
import { Router } from '@angular/router';
// import { ScenarioState } from '../scenario.state';

@Component({
  selector: 'app-scenario-setup-modal',
  standalone: true,
  imports: [
    ModalComponent,
    InputDirective,
    ReactiveFormsModule,
    InputFieldComponent,
  ],
  templateUrl: './scenario-setup-modal.component.html',
  styleUrl: './scenario-setup-modal.component.scss',
})
export class ScenarioSetupModalComponent {
  readonly dialogRef = inject(MatDialogRef<ScenarioSetupModalComponent>);

  scenarioNameForm = new FormGroup({
    scenarioName: new FormControl('', Validators.required),
  });
  submitting = false;
  errorMessage: string = '';
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { planId: number }, // Access the passed data
    private matSnackBar: MatSnackBar,
    private scenarioService: ScenarioService,
    private router: Router,
    ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  handleSubmit(): void {
    if (this.scenarioNameForm.valid) {
      this.submitting = true;
      const scenarioName =
        this.scenarioNameForm.get('scenarioName')?.value || '';
      this.createScenario(scenarioName);
    }
  }

  private createScenario(name: string) {
    // TODO: cannot submit without required values yet
    if (!this.data.planId) {
      this.dialogRef.close();
      return;
    }
    const planId = this.data.planId;
    this.scenarioService.createScenarioFromName(name, planId).subscribe({
      next: (result) => {
        this.dialogRef.close(result);
        this.submitting = false;
        if (result.id) {
          // this.scenarioState.setScenarioId(result.id);
          this.router.navigate(['plan', planId, 'scenario', result.id]);
        }
      },
      error: (e) => {
        // detect known errors
        if (
          e.error?.global &&
          e.error?.global.some((msg: string) =>
            msg.includes(
              'The fields planning_area, name must make a unique set.'
            )
          )
        ) {
          this.submitting = false;
          this.errorMessage =
            'This name is already used by another scenario in this planning area.';
        } else {
          this.submitting = false;

          // otherwise, show snackbar for unknown errors
          this.matSnackBar.open(
            '[Error] Unable to create scenario...',
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
          this.dialogRef.close(false);
        }
      },
    });
  }

  submitIfValid(event: Event) {
    if (this.submitting || this.scenarioNameForm.invalid) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    this.handleSubmit();
  }
}
