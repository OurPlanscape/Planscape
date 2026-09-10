import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  AdvStandLevelConstraintData,
  ApiModule,
  DataLayer,
  ScenarioDraftConfiguration,
} from '@app/types';
import { StepDirective } from '@styleguide';
import { AdvStandLevelConstraintsComponent } from '../step3/adv-stand-level-constraints/adv-stand-level-constraints.component';
import { StandLevelConstraintsComponent } from '../step3/stand-level-constraints.component';
import { FeaturesModule } from '@app/features/features.module';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { NewScenarioState } from '../new-scenario.state';
import { map, Observable, take } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { ModuleService } from '@app/services/module.service';
import { NamedConstraint } from '../step3/adv-stand-level-constraints-modal/adv-stand-level-constraints-modal.component';

const MAX_SELECTABLE_LAYERS = Number.POSITIVE_INFINITY;

interface ConstraintsParentForm {
  standLevelConstraints?: FormGroup<{
    max_slope: FormControl<number | null>;
    min_distance_from_road: FormControl<number | null>;
  }>;
  advStandLevelConstraints?: FormGroup<{
    constraints: FormControl<NamedConstraint[] | null>;
  }>;
}
@Component({
  selector: 'app-constraints-step',
  standalone: true,
  imports: [
    AdvStandLevelConstraintsComponent,
    AsyncPipe,
    FeaturesModule,
    ReactiveFormsModule,
    StandLevelConstraintsComponent,
  ],
  templateUrl: './constraints-step.component.html',
  styleUrl: './constraints-step.component.scss',
  providers: [
    { provide: StepDirective, useExisting: ConstraintsStepComponent },
  ],
})
export class ConstraintsStepComponent
  extends StepDirective<ScenarioDraftConfiguration>
  implements OnInit
{
  readonly form = new FormGroup<ConstraintsParentForm>({});

  constraintLayers$: Observable<DataLayer[]> = this.moduleService
    .getModule<
      ApiModule<AdvStandLevelConstraintData>
    >('advanced_stand_level_constraint')
    .pipe(
      map((data: ApiModule<AdvStandLevelConstraintData>) => {
        return data.options.datalayers;
      })
    );

  ngOnInit(): void {
    console.log('i am not empty, compiler');
  }

  constructor(
    private moduleService: ModuleService,
    private dataLayersStateService: DataLayersStateService,
    private newScenarioState: NewScenarioState
  ) {
    super();
  }

  getData(): Partial<ScenarioDraftConfiguration> {
    const formValues = this.form.getRawValue();

    // TypeScript now knows standLevelConstraints exists!
    const standLevelConstraints = formValues.standLevelConstraints;
    // const advStandLevelConstraints = formValues.advStandLevelConstraints;

    return {
      max_slope: standLevelConstraints?.max_slope ?? null,
      min_distance_from_road:
        standLevelConstraints?.min_distance_from_road ?? null,
    };
  }

  override beforeStepLoad() {
    this.dataLayersStateService.updateSelectedLayers([]);
    this.dataLayersStateService.setMaxSelectedLayers(MAX_SELECTABLE_LAYERS);
    // ensure that priority_objective layers are unselectable
    this.dataLayersStateService.clearUnselectableLayers();
    this.newScenarioState.scenarioConfig$.pipe(take(1)).subscribe((config) => {
      const draft = config as Partial<ScenarioDraftConfiguration>;
      const priorityIds = (draft.priorities ?? []).map((p) => p.datalayer);
      if (priorityIds && priorityIds.length > 0) {
        this.dataLayersStateService.setUnselectableLayers(
          priorityIds,
          'PRIORITY_OBJECTIVE'
        );
      }
    });
    // send this to the children? or just send the values down as observables?
    this.mapConfigToUI();
  }

  mapConfigToUI() {}
}
