import { Component, ViewChild } from '@angular/core';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { NgIf } from '@angular/common';
import { MatLegacyButtonModule } from '@angular/material/legacy-button';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { StepsComponent } from '../../../styleguide/steps/steps.component';
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
import { TreatmentGoalsComponent } from '../treatment-goals/treatment-goals.component';
import { StandSizeComponent } from '../stand-size/stand-size.component';
import { ScenarioConfig } from '@types';
import { GoalOverlayService } from '../../plan/create-scenarios/goal-overlay/goal-overlay.service';

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
    TreatmentGoalsComponent,
    StandSizeComponent,
  ],
  templateUrl: './scenario-creation.component.html',
  styleUrl: './scenario-creation.component.scss',
})
export class ScenarioCreationComponent {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  config: Partial<ScenarioConfig> = {};

  planId = this.route.snapshot.data['planId'];

  form = new FormGroup({
    scenarioName: new FormControl(
      '',
      [Validators.required],
      [this.scenarioNameMustBeUnique(this.scenarioService, this.planId)]
    ),
  });

  constructor(
    private dataLayersStateService: DataLayersStateService,
    private scenarioService: ScenarioService,
    private route: ActivatedRoute,
    private goalOverlayService: GoalOverlayService
  ) {
    this.dataLayersStateService.paths$
      .pipe(untilDestroyed(this), skip(1))
      .subscribe((path) => {
        if (path.length > 0) {
          this.tabGroup.selectedIndex = ScenarioTabs.DATA_LAYERS;
        }
      });
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

  saveStep(data: Partial<ScenarioConfig>) {
    this.config = { ...this.config, ...data };
    return of(true);
  }

  // dummy flag to test/debug. Remove once we implement running/saving the scenario
  finished = false;

  onFinish() {
    this.finished = true;
  }

  stepChanged() {
    this.goalOverlayService.close();
  }
}
