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
import { Plan, ClimateForesightRun } from '@types';
import { DataLayerSelectionComponent } from './data-layer-selection/data-layer-selection.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

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
  ],
  templateUrl: './climate-foresight-run.component.html',
  styleUrls: ['./climate-foresight-run.component.scss'],
})
export class ClimateForesightRunComponent implements OnInit {
  @ViewChild(StepsComponent) stepsComponent?: StepsComponent<any>;
  @ViewChild('dataLayerSelection')
  dataLayerSelectionComponent?: DataLayerSelectionComponent;

  currentPlan: Plan | null = null;
  currentRun: ClimateForesightRun | null = null;
  runId: number | null = null;
  savingStep = false;

  dataLayersForm: FormGroup | null = null;
  favorabilityForm: FormGroup | null = null;
  pillarsForm: FormGroup | null = null;
  assessmentForm: FormGroup | null = null;

  stepData: any = {};

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

  constructor(
    private breadcrumbService: BreadcrumbService,
    private route: ActivatedRoute,
    private router: Router,
    private planState: PlanState,
    private climateForesightService: ClimateForesightService,
    private snackBar: MatSnackBar
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

  private loadRunState(_run: ClimateForesightRun): void {
    // TODO: Set current step based on run progress
  }

  onStepComplete(data: any): void {
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

  saveStepData = (data: any): Observable<boolean> => {
    if (!this.runId) {
      this.snackBar.open('No run ID found', 'Close', { duration: 3000 });
      return of(false);
    }

    this.savingStep = true;
    const stepIndex = this.stepsComponent?.selectedIndex || 0;

    switch (stepIndex) {
      case 0:
        return this.saveDataLayers(data);
      default:
        this.savingStep = false;
        return of(false);
    }
  };

  private saveDataLayers(data: any): Observable<boolean> {
    if (!data || !data.dataLayers || !this.runId) {
      this.snackBar.open('Please select at least one data layer', 'Close', {
        duration: 3000,
      });
      this.savingStep = false;
      return of(false);
    }

    const inputDatalayers = data.dataLayers.map((layer: any) => ({
      datalayer: layer.id,
      favor_high: false,
      pillar: '',
    }));

    return new Observable<boolean>((observer) => {
      this.climateForesightService
        .updateRun(this.runId!, {
          input_datalayers: inputDatalayers,
        })
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
}
