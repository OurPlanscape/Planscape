import { Component, inject, Inject, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
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
import { Router, UrlTree } from '@angular/router';
import {
  Scenario,
  SCENARIO_TYPE,
  ScenarioV3Config,
  ScenarioV3Payload,
} from '@types';
import { map, of, switchMap, take, tap, throwError } from 'rxjs';
import { convertFlatConfigurationToDraftPayload, copyConfigurationToPayload, isPayloadValidForScenario } from '../scenario-helper';
import { ForsysService } from '@services/forsys.service';
import { ForsysData } from '../../types/module.types';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-scenario-setup-modal',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    ModalComponent,
    NgIf,
    InputDirective,
    ReactiveFormsModule,
    InputFieldComponent,
  ],
  templateUrl: './scenario-setup-modal.component.html',
})
export class ScenarioSetupModalComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ScenarioSetupModalComponent>);

  scenarioNameForm = new FormGroup({
    scenarioName: new FormControl(
      this.data.defaultName ?? '',
      Validators.required
    ),
  });
  submitting = false;
  errorMessage: string = '';

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      planId: number;
      fromClone: boolean;
      scenario?: Scenario;
      defaultName?: string;
      type: SCENARIO_TYPE;
    },
    private matSnackBar: MatSnackBar,
    private scenarioService: ScenarioService,
    private router: Router,
    private forsysService: ForsysService
  ) {
    this.forsysService.forsysData$
      .pipe(take(1))
      .subscribe((forsys: ForsysData) => {
        this.thresholdsData = forsys.thresholds;
      });
  }

  thresholdsData: any = null;
  loading = false;

  get editMode(): boolean {
    return this.data.scenario !== undefined && this.data.fromClone !== true;
  }

  get primaryCTA(): string {
    if (this.errorMessage !== '') {
      return 'Try Again';
    } else if (this.editMode) {
      return 'Done';
    }
    return 'Get Started';
  }

  ngOnInit(): void {
    // In case we are in edit mode we prefill the scenario name
    if (this.editMode && this.data.scenario) {
      this.scenarioNameForm
        .get('scenarioName')
        ?.setValue(this.data.scenario.name);
    }
    // if we are trying to clone a scenario but don't have a name yet...
    // we disable the form
    if (this.data.fromClone && this.data.defaultName === null) {
      this.loading = true;
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  setName(name: string): void {
    this.loading = false;
    this.data.defaultName = name;
    this.scenarioNameForm.get('scenarioName')?.setValue(this.data.defaultName);
    this.scenarioNameForm.get('scenarioName')?.enable();
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

  async reloadTo(url: string | UrlTree) {
    // Force reload a url route
    await this.router.navigateByUrl('/', { skipLocationChange: true });
    await this.router.navigateByUrl(url);
  }

  private patchClonedConfiguration(oldScenario: Scenario, newScenario: Scenario) {
    const scenarioSource$ = oldScenario.configuration
      ? of(oldScenario)
      : this.scenarioService.getScenario(oldScenario.id).pipe(take(1));

    scenarioSource$.pipe(
      map(fullScenario => copyConfigurationToPayload(fullScenario, newScenario)),
      switchMap(newPayload => {
        if (isPayloadValidForScenario(newScenario, newPayload)) {
          // If invalid, return an error observable to jump to the 'error' block
          return throwError(() => new Error('Invalid payload detected'));
        }

        // If valid, proceed to the patch call
        return this.scenarioService.patchScenarioConfig(newScenario.id!, newPayload);
      })
    ).subscribe({
      next: (response) => console.log('Successfully patched!', response),
      error: (err) => console.error('Process stopped:', err.message)
    });
  }

  private createScenario(name: string) {
    if (!this.data.planId) {
      this.dialogRef.close();
      return;
    }
    const planId = this.data.planId;
    const type = this.data.type;
    this.scenarioService.createScenario(name, planId, type).subscribe({
      next: (newScenario) => {
        this.dialogRef.close(newScenario);
        this.submitting = false;

        //for cloned scenarios, we copy configuration, then redirect
        if (this.data.fromClone && newScenario.id && this.data.scenario) {
          const oldScenario = this.data.scenario;
          this.patchClonedConfiguration(oldScenario, newScenario);
        }
        if (newScenario.id && this.data.fromClone === false) {
          this.router.navigate(['plan', planId, 'scenario', newScenario.id]);
        }
      },
      error: (e) => {
        this.submitting = false;
        if (
          e.error.errors?.global &&
          e.error.errors?.global.some((msg: string) =>
            msg.includes(
              'The fields planning_area, name must make a unique set.'
            )
          )
        ) {
          this.errorMessage =
            'This name is already used by another scenario in this planning area.';
        } else {
          this.showGenericErrorSnackbar();
          this.dialogRef.close(false);
        }
      },
    });
  }

  private showGenericErrorSnackbar() {
    this.matSnackBar.open(
      '[Error] Unable to create scenario...',
      'Dismiss',
      SNACK_ERROR_CONFIG
    );
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
          this.submitting = false;
          if (
            e.error.errors?.global &&
            e.error.errors?.global.some((msg: string) =>
              msg.includes(
                'The fields planning_area, name must make a unique set.'
              )
            )
          ) {
            this.errorMessage =
              'This name is already used by another scenario in this planning area.';
          } else {
            this.showGenericErrorSnackbar();
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
