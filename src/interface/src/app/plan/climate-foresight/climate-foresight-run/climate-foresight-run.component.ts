import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  interval,
  Observable,
  of,
  Subject,
  switchMap,
  take,
  takeUntil,
} from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormGroup } from '@angular/forms';
import { CdkStepperModule } from '@angular/cdk/stepper';
import {
  StepComponent,
  StepConfig,
  StepsComponent,
  StepsNavComponent,
} from '@styleguide';
import { SharedModule } from '@shared/shared.module';
import { PlanState } from '@plan/plan.state';
import { ClimateForesightService } from '@services/climate-foresight.service';
import {
  ClimateForesightRun,
  DataLayer,
  InputDatalayer,
  Pillar,
  Plan,
} from '@types';
import { DataLayerSelectionComponent } from '@plan/climate-foresight/climate-foresight-run/data-layer-selection/data-layer-selection.component';
import { AssignFavorabilityComponent } from '@plan/climate-foresight/climate-foresight-run/assign-favorability/assign-favorability.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { AssignPillarsComponent } from '@plan/climate-foresight/climate-foresight-run/assign-pillars/assign-pillars.component';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '@standalone/confirmation-dialog/confirmation-dialog.component';
import { SuccessDialogComponent } from '@styleguide/dialogs/success-dialog/success-dialog.component';
import { MAX_CLIMATE_DATALAYERS, SNACK_BOTTOM_NOTICE_CONFIG } from '@shared';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { MapModuleService } from '@services/map-module.service';
import { MAP_MODULE_NAME } from '@services/map-module.token';
import { MAX_SELECTED_DATALAYERS } from '@data-layers/data-layers/max-selected-datalayers.token';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { USE_GEOMETRY } from '@data-layers/data-layers/geometry-datalayers.token';
import * as Sentry from '@sentry/browser';

export interface PillarDragAndDrop extends Pillar {
  isOpen: boolean;
  dataLayers: DataLayer[];
}

type SaveStepData = {
  dataLayers: Partial<InputDatalayer>[];
  favorability: Partial<InputDatalayer>[];
};

@UntilDestroy()
@Component({
  selector: 'app-climate-foresight-run',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    StepsComponent,
    StepsNavComponent,
    StepComponent,
    CdkStepperModule,
    MatSnackBarModule,
    DataLayerSelectionComponent,
    AssignPillarsComponent,
    AssignFavorabilityComponent,
    CdkDropListGroup,
  ],
  templateUrl: './climate-foresight-run.component.html',
  styleUrls: ['./climate-foresight-run.component.scss'],
  providers: [
    DataLayersStateService,
    { provide: MAX_SELECTED_DATALAYERS, useValue: MAX_CLIMATE_DATALAYERS },
    MapModuleService,
    { provide: MAP_MODULE_NAME, useValue: 'climate_foresight' },
    { provide: USE_GEOMETRY, useValue: true },
  ],
})
export class ClimateForesightRunComponent implements OnInit {
  @ViewChild(StepsComponent) stepsComponent?: StepsComponent<SaveStepData>;
  @ViewChild('dataLayerSelection')
  dataLayerSelectionComponent?: DataLayerSelectionComponent;
  @ViewChild('assignFavorability')
  assignFavorabilityComponent?: AssignFavorabilityComponent;
  @ViewChild('assignPillars')
  assignPillarsComponent?: AssignPillarsComponent;

  currentPlan: Plan | null = null;
  currentRun: ClimateForesightRun | null = null;
  runId: number | null = null;
  savingStep = false;

  dataLayersForm: FormGroup | null = null;
  favorabilityForm: FormGroup | null = null;
  pillarsForm: FormGroup | null = new FormGroup({});
  assessmentForm: FormGroup | null = null;

  stepData: Record<number, SaveStepData> = {};

  private pollingInterval = 5000; // 5 seconds
  private stopPolling$ = new Subject<void>();

  stepsList: StepConfig[] = [
    { label: 'Select Data Layers', completed: false },
    { label: 'Assign Favorability', completed: false },
    { label: 'Assign Pillars', completed: false },
    { label: 'Save & Run Analysis', completed: false },
  ];

  get currentStepIndex(): number {
    return this.stepsComponent?.selectedIndex ?? 0;
  }

  get canGoBack(): boolean {
    return this.currentStepIndex > 0;
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this.stepsList.length - 1;
  }

  get canGoNext(): boolean {
    switch (this.currentStepIndex) {
      case 0:
        return this.dataLayerSelectionComponent?.form?.valid || false;
      case 1:
        return this.assignFavorabilityComponent?.canProceed || false;
      case 2:
        return true;
      default:
        return false;
    }
  }

  constructor(
    private breadcrumbService: BreadcrumbService,
    private route: ActivatedRoute,
    private router: Router,
    private planState: PlanState,
    private climateForesightService: ClimateForesightService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private mapModuleService: MapModuleService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(untilDestroyed(this)).subscribe((params) => {
      this.runId = params['runId'] ? +params['runId'] : null;
      if (this.runId) {
        this.loadRun();
      }
    });

    this.planState.currentPlan$
      .pipe(untilDestroyed(this))
      .subscribe((plan: Plan) => {
        this.mapModuleService.loadMapModule(plan.geometry).subscribe();
        this.currentPlan = plan;
      });
  }

  private loadRun(): void {
    if (!this.runId) return;

    this.climateForesightService
      .getRun(this.runId)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (run) => {
          this.currentRun = run;

          this.breadcrumbService.breadcrumb$
            .pipe(take(1))
            .subscribe((breadcrumb) => {
              if (breadcrumb?.label !== `Climate Foresight: ${run.name}`) {
                this.breadcrumbService.updateBreadCrumb({
                  label: `Climate Foresight: ${run.name}`,
                  backUrl: `/plan/${this.currentPlan?.id}/climate-foresight`,
                  icon: 'close',
                });
              }
            });
          this.loadRunState(run);
        },
        error: (error) => {
          Sentry.captureException(error);
          this.snackBar.open(
            'Failed to load run',
            'Close',
            SNACK_BOTTOM_NOTICE_CONFIG
          );
          this.router.navigate(['../'], { relativeTo: this.route });
        },
      });
  }

  private loadRunState(run: ClimateForesightRun): void {
    if (this.stepsComponent && run.current_step) {
      const stepIndex = run.current_step - 1;
      setTimeout(() => {
        this.stepsComponent!.selectedIndex = stepIndex;
      }, 0);
    }
  }

  onStepComplete(data: SaveStepData): void {
    const stepIndex = this.stepsComponent?.selectedIndex || 0;
    this.stepData[stepIndex] = data;
  }

  onFinished(): void {
    this.router.navigate([`/plan/${this.currentPlan?.id}/climate-foresight`], {
      relativeTo: this.route,
    });
  }

  goToNextStep(): void {
    if (this.stepsComponent) {
      this.stepsComponent.goNext();
    }
  }

  goToPreviousStep(): void {
    if (this.stepsComponent) {
      this.stepsComponent.goBack();
    }
  }

  saveStepData = (data: Partial<SaveStepData>): Observable<boolean> => {
    if (!this.runId) {
      this.snackBar.open(
        'No run ID found',
        'Close',
        SNACK_BOTTOM_NOTICE_CONFIG
      );
      return of(false);
    }

    this.savingStep = true;
    const stepIndex = this.stepsComponent?.selectedIndex || 0;

    switch (stepIndex) {
      case 0:
        return this.saveDataLayers(data);
      case 1:
        return this.saveFavorability(data);
      case 2:
        this.savePillars(data as any);
        // Return false since we don't want to move the stepper
        return of(false);
      default:
        this.savingStep = false;
        return of(false);
    }
  };

  private saveDataLayers(data: Partial<SaveStepData>): Observable<boolean> {
    if (!data || !data.dataLayers || !this.runId) {
      this.snackBar.open(
        'Please select at least one data layer',
        'Close',
        SNACK_BOTTOM_NOTICE_CONFIG
      );
      this.savingStep = false;
      return of(false);
    }

    const inputDatalayers = data.dataLayers.map(
      (layer: Partial<InputDatalayer>) => ({
        datalayer: layer.id,
      })
    );

    const currentStep = (this.currentStepIndex || 0) + 1;

    const nextStep = currentStep + 1;

    const currentFurthestStep = this.currentRun?.furthest_step || 0;
    const newFurthestStep = Math.max(nextStep, currentFurthestStep);

    return new Observable<boolean>((observer) => {
      this.climateForesightService
        .updateRun(this.runId!, {
          input_datalayers: inputDatalayers,
          current_step: nextStep,
          furthest_step: newFurthestStep,
        } as Partial<ClimateForesightRun>)
        .pipe(untilDestroyed(this))
        .subscribe({
          next: (updatedRun) => {
            this.currentRun = updatedRun;

            this.snackBar.open(
              'Data layers saved',
              'Close',
              SNACK_BOTTOM_NOTICE_CONFIG
            );
            this.savingStep = false;

            observer.next(true);
            observer.complete();
          },
          error: (error) => {
            Sentry.captureException(error);
            this.snackBar.open(
              'Failed to save data layers: ' +
                (error?.error.errors?.detail ||
                  error?.message ||
                  'Unknown error'),
              'Close',
              SNACK_BOTTOM_NOTICE_CONFIG
            );

            this.savingStep = false;
            observer.next(false);
            observer.complete();
          },
        });
    });
  }

  private saveFavorability(data: Partial<SaveStepData>): Observable<boolean> {
    if (!data || !data.favorability || !this.runId) {
      this.snackBar.open(
        'Please assign favorability for all layers',
        'Close',
        SNACK_BOTTOM_NOTICE_CONFIG
      );
      this.savingStep = false;
      return of(false);
    }

    const updatedInputDatalayers = this.currentRun?.input_datalayers?.map(
      (input) => {
        const favorabilityAssignment = data.favorability!.find(
          (f: Partial<InputDatalayer>) => f.datalayer === input.datalayer
        );
        return {
          ...input,
          favor_high: favorabilityAssignment?.favor_high ?? input.favor_high,
        };
      }
    );

    const currentStep = (this.currentStepIndex || 0) + 1;

    const nextStep = currentStep + 1;

    const currentFurthestStep = this.currentRun?.furthest_step || 0;
    const newFurthestStep = Math.max(nextStep, currentFurthestStep);

    return new Observable<boolean>((observer) => {
      this.climateForesightService
        .updateRun(this.runId!, {
          input_datalayers: updatedInputDatalayers,
          current_step: nextStep,
          furthest_step: newFurthestStep,
        })
        .pipe(untilDestroyed(this))
        .subscribe({
          next: (updatedRun) => {
            this.currentRun = updatedRun;

            this.snackBar.open(
              'Favorability saved',
              'Close',
              SNACK_BOTTOM_NOTICE_CONFIG
            );
            this.savingStep = false;

            observer.next(true);
            observer.complete();
          },
          error: (error) => {
            Sentry.captureException(error);
            this.snackBar.open(
              'Failed to save favorability: ' +
                (error?.error?.errors.detail ||
                  error?.message ||
                  'Unknown error'),
              'Close',
              SNACK_BOTTOM_NOTICE_CONFIG
            );

            this.savingStep = false;
            observer.next(false);
            observer.complete();
          },
        });
    });
  }

  savePillars(updatedPillars: any[]): void {
    const currentStep = (this.currentStepIndex || 0) + 1;
    const inputDatalayers = this.currentRun?.input_datalayers || [];

    // Assign pillar for each input datalayer
    inputDatalayers.forEach((input) => {
      const updatedPillar = updatedPillars.find(
        (p) => p.datalayer === input.datalayer
      );
      input.pillar = updatedPillar?.pillar || null;
    });

    this.dialog
      .open(ConfirmationDialogComponent, {
        data: {
          title: 'Ready to run the analysis?',
          body: '<p>You are about to run the analysis using the selected data layers, thresholds, and pillar assignments. Once the analysis starts, these settings cannot be modified.</p><p>Are you sure you want to proceed?</p>',
          primaryCta: 'Run Analysis',
        },
      })
      .afterClosed()
      .subscribe((modalResponse: any) => {
        if (modalResponse) {
          // newFurthestStep and next step is the same as current step since step 4 is not a real step
          this.saveRun(inputDatalayers, currentStep, currentStep);
        } else {
          this.savingStep = false;
        }
      });
  }

  saveRun(
    inputDatalayers: InputDatalayer[],
    nextStep: number,
    newFurthestStep: number,
    runAnalysis = true
  ): void {
    this.climateForesightService
      .updateRun(this.runId!, {
        input_datalayers: inputDatalayers,
        current_step: nextStep,
        furthest_step: newFurthestStep,
      })
      .subscribe({
        next: (updatedRun) => {
          if (runAnalysis) {
            this.currentRun = updatedRun;
            this.runAnalysis();
          }
        },
        error: (error) => {
          this.snackBar.open(
            'Failed to save pillars: ' +
              (error?.error?.errors.detail ||
                error?.message ||
                'Unknown error'),
            'Close',
            SNACK_BOTTOM_NOTICE_CONFIG
          );
          this.savingStep = false;
        },
      });
  }

  runAnalysis(): void {
    this.displaySuccessDialog();
    this.climateForesightService
      .runAnalysis(this.runId!)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (runningRun) => {
          this.currentRun = runningRun;
          this.snackBar.open(
            'Analysis started. You will be notified when it completes.',
            'Close',
            SNACK_BOTTOM_NOTICE_CONFIG
          );

          this.startPollingForRunStatus();

          this.savingStep = false;

          this.router.navigate(
            [`/plan/${this.currentPlan?.id}/climate-foresight`],
            {
              relativeTo: this.route,
            }
          );
        },
        error: (error) => {
          Sentry.captureException(error);
          this.snackBar.open(
            'Failed to trigger analysis: ' +
              (error?.error?.errors.detail ||
                error?.message ||
                'Unknown error'),
            'Close',
            SNACK_BOTTOM_NOTICE_CONFIG
          );

          this.savingStep = false;
        },
      });
  }

  displaySuccessDialog() {
    this.dialog
      .open(SuccessDialogComponent, {
        data: {
          infoType: 'success',
          headline: 'Your analysis is in progress',
          message:
            "You'll be notified when it's ready, translated data can be viewed in the Data Viewer.",
        },
      })
      .afterClosed()
      .subscribe(() => {
        this.savingStep = false;
        // On modal closed go to the climate home page
        this.onFinished();
      });
  }

  /**
   * Start polling for run status updates every 5 seconds
   * Stops when run status becomes 'done' or component is destroyed
   */
  private startPollingForRunStatus(): void {
    if (this.currentRun?.status !== 'running') {
      return;
    }

    interval(this.pollingInterval)
      .pipe(
        untilDestroyed(this),
        takeUntil(this.stopPolling$),
        switchMap(() => this.climateForesightService.getRun(this.runId!))
      )
      .subscribe({
        next: (updatedRun) => {
          this.currentRun = updatedRun;

          if (updatedRun.status === 'done') {
            this.stopPolling$.next();
            this.stopPolling$.complete();
            this.snackBar.open(
              'Analysis completed successfully!',
              'Close',
              SNACK_BOTTOM_NOTICE_CONFIG
            );
          }
        },
        error: (err) => {
          Sentry.captureException(err);
        },
      });
  }

  pillarsUpdated(layers: InputDatalayer[]) {
    const currentStep = (this.currentStepIndex || 0) + 1;
    const inputDatalayers = this.currentRun?.input_datalayers || [];

    // Assign pillar for each input datalayer
    inputDatalayers.forEach((input) => {
      const updatedPillar = layers.find((p) => p.datalayer === input.datalayer);
      input.pillar = updatedPillar?.pillar || null;
    });
    this.saveRun(inputDatalayers, currentStep, currentStep, false);
  }
}
