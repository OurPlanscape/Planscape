import { Component, HostListener, ViewChild } from '@angular/core';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { NgIf } from '@angular/common';
import { MatLegacyButtonModule } from '@angular/material/legacy-button';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { StepsComponent } from '@styleguide';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { map, of, skip } from 'rxjs';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ScenarioService } from '@services';
import { ActivatedRoute } from '@angular/router';
import { LegacyMaterialModule } from 'src/app/material/legacy-material.module';
import { nameMustBeNew } from 'src/app/validators/unique-scenario';
import {
  ScenarioCreation,
  ScenarioConfigPayload,
  ScenarioCreationPayload,
} from '@types';
import { GoalOverlayService } from '../../plan/create-scenarios/goal-overlay/goal-overlay.service';
import { Step1Component } from '../step1/step1.component';
import { CanComponentDeactivate } from '@services/can-deactivate.guard';
import { ExitWorkflowModalComponent } from '../exit-workflow-modal/exit-workflow-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';

enum ScenarioTabs {
  CONFIG,
  DATA_LAYERS,
}

@UntilDestroy()
@Component({
  selector: 'app-scenario-creation',
  standalone: true,
  imports: [
    MatTabsModule,
    ReactiveFormsModule,
    MatLegacyButtonModule,
    NgIf,
    DataLayersComponent,
    StepsComponent,
    CdkStepperModule,
    LegacyMaterialModule,
    Step1Component,
  ],
  templateUrl: './scenario-creation.component.html',
  styleUrl: './scenario-creation.component.scss',
})
export class ScenarioCreationComponent implements CanComponentDeactivate {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  config: Partial<ScenarioCreation> = {};

  planId = this.route.snapshot.data['planId'];

  form = new FormGroup({
    scenarioName: new FormControl(
      '',
      [Validators.required],
      [this.scenarioNameMustBeUnique(this.scenarioService, this.planId)]
    ),
  });

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload($event: any) {
    if (!this.finished) {
      // text only for noncompliant browsers
      $event.returnValue = 'Are you sure you want to leave this page? Your unsaved changes will be lost.';
    }
  }

  constructor(
    private dataLayersStateService: DataLayersStateService,
    private scenarioService: ScenarioService,
    private route: ActivatedRoute,
    private goalOverlayService: GoalOverlayService,
    private dialog: MatDialog
  ) {
    this.dataLayersStateService.paths$
      .pipe(untilDestroyed(this), skip(1))
      .subscribe((path) => {
        if (path.length > 0) {
          this.tabGroup.selectedIndex = ScenarioTabs.DATA_LAYERS;
        }
      });
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (this.finished) {
      return true;
    }
    const dialogRef = this.dialog.open(ExitWorkflowModalComponent);
    return dialogRef.afterClosed();
  }

  // Async validator
  scenarioNameMustBeUnique(
    scenarioService: ScenarioService,
    planId: number
  ): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const name = control.value;

      if (!name) {
        return of(null);
      }

      return scenarioService.getScenariosForPlan(planId).pipe(
        map((scenarios) => {
          const names = scenarios.map((s) => s.name);
          return nameMustBeNew(control, names);
        })
      );
    };
  }

  saveStep(data: Partial<ScenarioCreation>) {
    this.config = { ...this.config, ...data };
    return of(true);
  }

  // dummy flag to test/debug. Remove once we implement running/saving the scenario
  finished = false;

  onFinish() {
    // TODO: Onfinish convert the config to scenarioPayload using the following line and send to backend:
    // const body = this.getScenarioPayloadFromConfiguration(this.config)
    this.finished = true;
  }

  stepChanged() {
    this.goalOverlayService.close();
  }

  getScenarioPayloadFromConfiguration(scenario: ScenarioCreation) {
    // TODO: Remove Partial<> once we implemented all steps
    const result: Partial<ScenarioCreationPayload> = {
      configuration: {
        stand_size: scenario.configuration.stand_size,
      } as ScenarioConfigPayload,
      name: this.form.get('name')?.value,
      treatment_goal: scenario.treatment_goal,
      status: 'NOT_STARTED',
      planning_area: this.planId,
    };
    return result;
  }
}
