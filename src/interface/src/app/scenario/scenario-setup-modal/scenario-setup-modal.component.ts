import { Component, inject, Inject, OnInit } from '@angular/core';
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
import { Scenario } from '@types';

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
export class ScenarioSetupModalComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ScenarioSetupModalComponent>);

  scenarioNameForm = new FormGroup({
    scenarioName: new FormControl('', Validators.required),
  });
  submitting = false;
  errorMessage: string = '';
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { planId: number; scenario?: Scenario }, // Access the passed data
    private matSnackBar: MatSnackBar,
    private scenarioService: ScenarioService,
    private router: Router
  ) {}

  get editMode(): boolean {
    return this.data.scenario !== undefined;
  }

  get primaryCTA(): string {
    if (this.errorMessage !== '') {
      return 'Try Again';
    } else if (this.editMode) {
      return 'Done';
    }
    return 'Create';
  }

  ngOnInit(): void {
    // In case we are in edit mode we prefill the scenario name
    if (this.editMode && this.data.scenario) {
      this.scenarioNameForm
        .get('scenarioName')
        ?.setValue(this.data.scenario.name);
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  handleSubmit(): void {
    if (this.scenarioNameForm.valid) {
      this.submitting = true;
      const scenarioName =
        this.scenarioNameForm.get('scenarioName')?.value || '';

      if (!this.editMode) {
        this.createScenario(scenarioName);
      } else {
        this.editScenarioName(scenarioName);
      }
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
        if (result) {
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

  private editScenarioName(name: string) {
    if (!this.data.planId || !this.data.scenario?.id) {
      this.dialogRef.close();
      return;
    }
    this.scenarioService
      .editScenarioName(this.data.scenario.id, name, this.data.planId)
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
          this.submitting = false;
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
            this.errorMessage =
              'Something went wrong while saving your changes. Please try again in a moment.';
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
