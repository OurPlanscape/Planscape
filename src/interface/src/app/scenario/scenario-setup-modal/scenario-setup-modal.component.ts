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
import { Scenario, SCENARIO_TYPE } from '@types';
import { EMPTY, from, map, Observable, switchMap, take, tap } from 'rxjs';
import { ForsysService } from '@services/forsys.service';
import { ForsysData } from '../../types/module.types';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { getPlanPath } from '@plan/plan-helpers';

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
      parentId?: number;
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

      // in handleSubmit
      if (this.data.fromClone && !this.editMode && this.data.scenario) {
        this.handleClone(this.data.scenario, scenarioName).subscribe({
          error: (e) => this.handleSubmitError(e),
        });
      } else if (!this.editMode) {
        this.createScenario(scenarioName);
      } else {
        this.editScenarioName(scenarioName);
      }
    }
  }

  private handleClone(
    oldScenario: Scenario,
    newName: string
  ): Observable<void> {
    this.submitting = true;
    return this.scenarioService.cloneScenario(oldScenario.id!, newName).pipe(
      // wait for the route reload to finish so the spinner stays up until then
      switchMap((result) =>
        from(
          this.reloadTo(
            `${this.planPath(result.planning_area)}/scenario/${result.id}`
          )
        )
      ),
      tap(() => this.dialogRef.close(true)),
      map(() => void 0)
    );
  }

  async reloadTo(url: string | UrlTree) {
    // Force reload a url route
    await this.router.navigateByUrl('/', { skipLocationChange: true });
    await this.router.navigateByUrl(url);
  }

  // Dialogs only see the root route, so read the workspace off the router state.
  private planPath(planId: number) {
    return getPlanPath(planId, this.router.routerState.snapshot.root);
  }

  private createScenario(name: string) {
    if (!this.data.planId) {
      this.dialogRef.close();
      return;
    }

    const { planId, type, fromClone, parentId } = this.data;

    this.scenarioService
      .createScenario(name, planId, type, parentId)
      .pipe(
        tap((newScenario) => {
          this.dialogRef.close(newScenario);
          this.submitting = false;
        }),
        switchMap((newScenario) => {
          if (!fromClone && newScenario.id) {
            this.router.navigate([
              this.planPath(planId),
              'scenario',
              newScenario.id,
            ]);
          }
          return EMPTY;
        })
      )
      .subscribe({
        error: (e) => {
          this.handleSubmitError(e);
        },
      });
  }

  private showErrorSnackbar(message?: string) {
    const displayMessage =  message ?? '[Error] Unable to create scenario...';

    this.matSnackBar.open(
      displayMessage,
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
            this.showErrorSnackbar();
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

  private handleSubmitError(e: any, closeOnGeneric = false) {
    this.submitting = false;
    this.dialogRef.close(false);

    const isNameConflict = e?.error?.errors?.global?.some((msg: string) =>
      msg.includes('The fields planning_area, name must make a unique set.')
    );
    if (isNameConflict) {
      this.errorMessage =
        'This name is already used by another scenario in this planning area.';
    } else {
      this.showErrorSnackbar();
      if (closeOnGeneric) this.dialogRef.close(false);
    }
  }
}
