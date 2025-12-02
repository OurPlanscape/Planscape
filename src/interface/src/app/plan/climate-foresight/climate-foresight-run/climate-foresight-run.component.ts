import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, take } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormGroup } from '@angular/forms';
import { CdkStepperModule } from '@angular/cdk/stepper';

import {
  StepsComponent,
  StepsNavComponent,
  StepsActionsComponent,
  StepComponent,
  StepConfig,
} from '@styleguide';
import { SharedModule } from '../../../shared/shared.module';
import { PlanState } from '../../plan.state';
import { ClimateForesightService } from '@services/climate-foresight.service';
import {
  Plan,
  ClimateForesightRun,
  InputDatalayer,
  Pillar,
  DataLayer,
} from '@types';
import { DataLayerSelectionComponent } from './data-layer-selection/data-layer-selection.component';
import { AssignFavorabilityComponent } from './assign-favorability/assign-favorability.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { AssignPillarsComponent } from './assign-pillars/assign-pillars.component';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from 'src/app/standalone/confirmation-dialog/confirmation-dialog.component';
import { SuccessDialogComponent } from 'src/styleguide/dialogs/success-dialog/success-dialog.component';

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
    StepsActionsComponent,
    StepComponent,
    CdkStepperModule,
    MatSnackBarModule,
    DataLayerSelectionComponent,
    AssignPillarsComponent,
    AssignFavorabilityComponent,
  ],
  templateUrl: './climate-foresight-run.component.html',
  styleUrls: ['./climate-foresight-run.component.scss'],
})
export class ClimateForesightRunComponent implements OnInit {
  @ViewChild(StepsComponent) stepsComponent?: StepsComponent<SaveStepData>;
  @ViewChild('dataLayerSelection')
  dataLayerSelectionComponent?: DataLayerSelectionComponent;
  @ViewChild('assignFavorability')
  assignFavorabilityComponent?: AssignFavorabilityComponent;

  currentPlan: Plan | null = null;
  currentRun: ClimateForesightRun | null = null;
  runId: number | null = null;
  savingStep = false;

  dataLayersForm: FormGroup | null = null;
  favorabilityForm: FormGroup | null = null;
  pillarsForm: FormGroup | null = new FormGroup({});
  assessmentForm: FormGroup | null = null;

  stepData: Record<number, SaveStepData> = {};

  stepsList: StepConfig[] = [
    { label: 'Select Data Layers', completed: false },
    { label: 'Assign Favorability', completed: false },
    { label: 'Assign Pillars', completed: false },
    { label: 'Run & Risk Assessment', completed: false },
  ];

  get currentStepIndex(): number {
    return this.stepsComponent?.selectedIndex ?? 0;
  }

  get totalSteps(): number {
    return this.stepsComponent?.steps?.length ?? 0;
  }

  get canGoBack(): boolean {
    return this.currentStepIndex > 0;
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this.totalSteps - 1;
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
    private dialog: MatDialog
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
        this.currentPlan = plan;
      });
  }

  // ERROR_SURVEY - opens generic snackbar for any error, doesnt use backend info 
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
          console.error('Error loading run:', error);
          this.snackBar.open('Failed to load run', 'Close', { duration: 3000 });
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
      this.snackBar.open('No run ID found', 'Close', { duration: 3000 });
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
      this.snackBar.open('Please select at least one data layer', 'Close', {
        duration: 3000,
      });
      this.savingStep = false;
      return of(false);
    }

    const inputDatalayers = data.dataLayers.map(
      (layer: Partial<InputDatalayer>) => ({
        datalayer: layer.id,
        pillar: null,
      })
    );

    const currentStep = (this.currentStepIndex || 0) + 1;

    const nextStep = currentStep + 1;

    const currentFurthestStep = this.currentRun?.furthest_step || 0;
    const newFurthestStep = Math.max(nextStep, currentFurthestStep);

  // ERROR_SURVEY - displays snackbar, logs error, displays error directly from backend
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

            this.snackBar.open('Data layers saved', 'Close', {
              duration: 2000,
            });
            this.savingStep = false;

            observer.next(true);
            observer.complete();
          },
          error: (error) => {
            console.error('Error saving data layers:', error);
            this.snackBar.open(
              'Failed to save data layers: ' +
                (error?.error?.detail || error?.message || 'Unknown error'),
              'Close',
              { duration: 5000 }
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
      this.snackBar.open('Please assign favorability for all layers', 'Close', {
        duration: 3000,
      });
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

  // ERROR_SURVEY - displays snackbar, logs error, displays error directly from backend
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

            this.snackBar.open('Favorability saved', 'Close', {
              duration: 2000,
            });
            this.savingStep = false;

            observer.next(true);
            observer.complete();
          },
          error: (error) => {
            console.error('Error saving favorability:', error);
            this.snackBar.open(
              'Failed to save favorability: ' +
                (error?.error?.detail || error?.message || 'Unknown error'),
              'Close',
              { duration: 5000 }
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

  // ERROR_SURVEY - displays snackbar, logs error, displays error directly from backend
  saveRun(
    inputDatalayers: InputDatalayer[],
    nextStep: number,
    newFurthestStep: number
  ): void {
    this.climateForesightService
      .updateRun(this.runId!, {
        input_datalayers: inputDatalayers,
        current_step: nextStep,
        furthest_step: newFurthestStep,
      })
      .subscribe({
        next: (updatedRun) => {
          this.currentRun = updatedRun;
          this.runAnalysis();
        },
        error: (error) => {
          console.error('Error saving pillars:', error);
          this.snackBar.open(
            'Failed to save pillars: ' +
              (error?.error?.detail || error?.message || 'Unknown error'),
            'Close',
            { duration: 5000 }
          );
          this.savingStep = false;
        },
      });
  }

  runAnalysis(): void {
    // TODO: Execute analysis
    // On success display success dialog
    this.displaySuccessDialog();
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
}
