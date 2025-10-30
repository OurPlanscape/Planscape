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
import { Router, UrlTree } from '@angular/router';
import { Scenario, ScenarioDraftConfig, ScenarioDraftPayload } from '@types';
import { map } from 'rxjs';
import { convertFlatConfigurationToDraftPayload } from '../scenario-helper';
import { NewScenarioState } from '../new-scenario.state';

@Component({
  selector: 'app-scenario-setup-modal',
  standalone: true,
  imports: [
    ModalComponent,
    InputDirective,
    ReactiveFormsModule,
    InputFieldComponent,
  ],
  providers: [NewScenarioState],
  templateUrl: './scenario-setup-modal.component.html',
  styleUrl: './scenario-setup-modal.component.scss',
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
    }, // Access the passed data
    private matSnackBar: MatSnackBar,
    private scenarioService: ScenarioService,
    private router: Router,
    private newScenarioState: NewScenarioState
  ) {}

  get editMode(): boolean {
    return this.data.scenario !== undefined && this.data.fromClone !== true;
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

  copyConfiguration(oldScenario: Scenario, newScenario: Scenario) {
    if (newScenario.id) {
      const thresholdsIdMap = new Map<string, number>();
      thresholdsIdMap.set('slope', this.newScenarioState.getSlopeId());
      thresholdsIdMap.set(
        'distance_to_roads',
        this.newScenarioState.getDistanceToRoadsId()
      );
      let newPayload: Partial<ScenarioDraftPayload> = {};
      if (oldScenario.version === 'V3') {
        const oldConfig: Partial<ScenarioDraftConfig> =
          oldScenario.configuration as ScenarioDraftConfig;
        newPayload = {
          configuration: oldConfig,
        };
      } else if (oldScenario.version === 'V2' || oldScenario.version === 'V1') {
        const oldConfig: Partial<ScenarioDraftConfig> =
          oldScenario.configuration;
        newPayload = convertFlatConfigurationToDraftPayload(
          oldConfig,
          thresholdsIdMap
        );
      }
      if (Number(oldScenario.treatment_goal?.id)) {
        const num = Number(oldScenario.treatment_goal?.id);
        newPayload.treatment_goal = num;
      }
      this.scenarioService
        .patchScenarioConfig(newScenario.id, newPayload)
        .pipe(
          map((result) => {
            this.reloadTo(
              `/plan/${newScenario.planning_area}/scenario/${result.id}`
            );
          })
        )
        .subscribe();
    }
  }

  async reloadTo(url: string | UrlTree) {
    // Force reload a url route
    await this.router.navigateByUrl('/', { skipLocationChange: true });
    await this.router.navigateByUrl(url);
  }

  private createScenario(name: string) {
    if (!this.data.planId) {
      this.dialogRef.close();
      return;
    }
    const planId = this.data.planId;
    this.scenarioService.createScenarioFromName(name, planId).subscribe({
      next: (result) => {
        this.dialogRef.close(result);
        this.submitting = false;

        if (this.data.fromClone && result.id && this.data.scenario) {
          //note: we redirect after copying the config
          this.copyConfiguration(this.data.scenario, result);
        }
        // else not clone?
        if (result.id && this.data.fromClone === false) {
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
