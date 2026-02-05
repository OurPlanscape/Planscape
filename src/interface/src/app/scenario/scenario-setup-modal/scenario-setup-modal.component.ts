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
import { map, take } from 'rxjs';
import { convertFlatConfigurationToDraftPayload } from '@app/scenario/scenario-helper';
import { ForsysService } from '@services/forsys.service';
import { ForsysData } from '@types';
import { FeatureService } from '@app/features/feature.service';

@Component({
  selector: 'app-scenario-setup-modal',
  standalone: true,
  imports: [
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
    private forsysService: ForsysService,
    private featureService: FeatureService
  ) {
    this.forsysService.forsysData$
      .pipe(take(1))
      .subscribe((forsys: ForsysData) => {
        this.thresholdsData = forsys.thresholds;
      });
  }

  thresholdsData: any = null;

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
    let newPayload: Partial<ScenarioV3Payload> = {};
    if (oldScenario.version === 'V3') {
      const oldConfig: Partial<ScenarioV3Config> =
        oldScenario.configuration as ScenarioV3Config;
      newPayload = {
        configuration: oldConfig,
      };
    } else if (oldScenario.version === 'V2' || oldScenario.version === 'V1') {
      const oldConfig: Partial<ScenarioV3Config> = oldScenario.configuration;
      const thresholdsIdMap = new Map<string, number>();
      thresholdsIdMap.set('slope', this.thresholdsData.slope?.id);
      thresholdsIdMap.set(
        'distance_to_roads',
        this.thresholdsData.distance_from_roads?.id
      );
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
      .patchScenarioConfig(newScenario.id!, newPayload)
      .pipe(
        map((result) => {
          this.reloadTo(
            `/plan/${newScenario.planning_area}/scenario/${result.id}`
          );
        })
      )
      .subscribe();
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
    const type = this.data.type;
    this.scenarioService.createScenario(name, planId, type).subscribe({
      next: (result) => {
        this.dialogRef.close(result);
        this.submitting = false;

        //for cloned scenarios, we copy configuration, then redirect
        if (this.data.fromClone && result.id && this.data.scenario) {
          this.copyConfiguration(this.data.scenario, result);
        }
        if (result.id && this.data.fromClone === false) {
          this.router.navigate(['plan', planId, 'scenario', result.id]);
        }
      },
      error: (e) => {
        this.submitting = false;
        if (this.featureService.isFeatureEnabled('CUSTOM_EXCEPTION_HANDLER')) {
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
        } else {
          if (
            e.error?.global &&
            e.error?.global.some((msg: string) =>
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
            this.featureService.isFeatureEnabled('CUSTOM_EXCEPTION_HANDLER')
          ) {
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
          } else {
            if (
              e.error?.global &&
              e.error?.global.some((msg: string) =>
                msg.includes(
                  'The fields planning_area, name must make a unique set.'
                )
              )
            ) {
              this.errorMessage =
                'This name is already used by another scenario in this planning area.';
            } else {
              this.errorMessage =
                'Something went wrong while saving your changes. Please try again in a moment.';
            }
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
