import { Component, inject } from '@angular/core';
import {
  InputDirective,
  InputFieldComponent,
  ModalComponent,
  ModalInfoComponent,
} from '@styleguide';
import { MatDialogRef } from '@angular/material/dialog';
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

@Component({
  selector: 'app-scenario-setup-modal',
  standalone: true,
  imports: [
    ModalComponent,
    InputDirective,
    ReactiveFormsModule,
    InputFieldComponent,
    ModalInfoComponent,
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

  constructor(
    private matSnackBar: MatSnackBar,
    private scenarioService: ScenarioService,
    private router: Router
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  handleSubmit(): void {
    if (this.scenarioNameForm.valid) {
      this.submitting = true;
      //TODO: check against existing names

      const scenarioName =
        this.scenarioNameForm.get('scenarioName')?.value || '';
      this.createScenario(scenarioName);
    }
  }

  private createScenario(name: string) {
    // TODO: cannot submit without required values yet
    this.scenarioService.createScenarioFromName(name).subscribe({
      next: (result) => {
        this.dialogRef.close(result);
        this.submitting = false;
        if (result) {
          this.router.navigate([
            '/plan/',
            result.planning_area,
            '/scenario/',
            result.id,
          ]);
        }
      },
      error: (e) => {
        this.matSnackBar.open(
          '[Error] Unable to create scenario...',
          'Dismiss',
          SNACK_ERROR_CONFIG
        );
        this.submitting = false;
        this.dialogRef.close(false);
      },
    });
  }
}
