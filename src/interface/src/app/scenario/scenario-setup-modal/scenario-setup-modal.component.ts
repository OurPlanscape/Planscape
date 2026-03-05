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
import { EMPTY, map, Observable, of, switchMap, take, tap } from 'rxjs';
import {
  convertOldConfigurationToV3Payload,
  sanitizePayloadForScenarioType,
} from '../scenario-helper';
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

  private handleClone(
    oldScenario: Scenario,
    newScenario: Scenario
  ): Observable<void> {
    const source$ = oldScenario.configuration
      ? of(oldScenario)
      : this.scenarioService.getScenario(oldScenario.id).pipe(take(1));

    return source$.pipe(
      switchMap((fullOldScenario) =>
        this.applyClonedConfig(fullOldScenario, newScenario)
      )
    );
  }

  private applyClonedConfig(
    oldScenario: Scenario,
    newScenario: Scenario
  ): Observable<void> {
    let newPayload = this.buildClonedPayload(oldScenario, newScenario);
    const redirectUrl = `/plan/${newScenario.planning_area}/scenario/${newScenario.id}`;

    if (
      !newPayload.configuration ||
      Object.keys(newPayload.configuration).length === 0
    ) {
      this.reloadTo(redirectUrl);
      return EMPTY;
    }

    return this.scenarioService
      .patchScenarioConfig(newScenario.id!, newPayload)
      .pipe(
        tap((result) =>
          this.reloadTo(`/plan/${result.planning_area}/scenario/${result.id}`)
        ),
        map(() => void 0)
      );
  }

  private buildClonedPayload(
    oldScenario: Scenario,
    newScenario: Scenario
  ): Partial<ScenarioV3Payload> {
    let payload: Partial<ScenarioV3Payload> = {};

    if (oldScenario.version === 'V3') {
      payload.configuration = structuredClone(
        oldScenario.configuration
      ) as ScenarioV3Config;
    } else if (oldScenario.version === 'V2' || oldScenario.version === 'V1') {
      const thresholdsIdMap = new Map([
        ['slope', this.thresholdsData.slope?.id],
        ['distance_to_roads', this.thresholdsData.distance_from_roads?.id],
      ]);
      const oldConfig: Partial<ScenarioV3Config> = oldScenario.configuration;

      payload = convertOldConfigurationToV3Payload(oldConfig, thresholdsIdMap);
    }

    if (Number(oldScenario.treatment_goal?.id)) {
      payload.treatment_goal = Number(oldScenario.treatment_goal?.id);
    }

    return sanitizePayloadForScenarioType(newScenario, payload);
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

    const { planId, type, fromClone, scenario } = this.data;

    this.scenarioService
      .createScenario(name, planId, type)
      .pipe(
        tap((newScenario) => {
          this.dialogRef.close(newScenario);
          this.submitting = false;
        }),
        switchMap((newScenario) => {
          if (fromClone && newScenario.id && scenario) {
            return this.handleClone(scenario, newScenario);
          }
          if (!fromClone && newScenario.id) {
            this.router.navigate(['plan', planId, 'scenario', newScenario.id]);
          }
          return EMPTY;
        })
      )
      .subscribe({
        error: (e) => {
          this.submitting = false;
          const isNameConflict = e.error.errors?.global?.some((msg: string) =>
            msg.includes(
              'The fields planning_area, name must make a unique set.'
            )
          );
          if (isNameConflict) {
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
