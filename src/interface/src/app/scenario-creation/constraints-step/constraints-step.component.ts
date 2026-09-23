import { Component, OnInit, ViewChild } from '@angular/core';
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
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ModuleService } from '@app/services/module.service';
import { NamedConstraint } from '../step3/adv-stand-level-constraints-modal/adv-stand-level-constraints-modal.component';
import { UntilDestroy } from '@ngneat/until-destroy';

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
@UntilDestroy()
@Component({
  selector: 'app-constraints-step',
  standalone: true,
  imports: [
    AdvStandLevelConstraintsComponent,
    AsyncPipe,
    FeaturesModule,
    NgIf,
    NgFor,
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
  @ViewChild('advConstraintsComponent')
  advConstraintsComponent!: AdvStandLevelConstraintsComponent;

  readonly form = new FormGroup<ConstraintsParentForm>({
    standLevelConstraints: new FormGroup({
      max_slope: new FormControl<number | null>(null),
      min_distance_from_road: new FormControl<number | null>(null),
    }),
    // Note, the child form adds the advStandLevelConstraints dynamically,
    //  since we're honoring ADV_STAND_LEVEL_CONSTRAINTS flag as an option.
  });

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
    //
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
    console.log('the current formvalues are:', formValues);
    // TypeScript now knows standLevelConstraints exists!
    const standLevelConstraints = formValues.standLevelConstraints;
    const advStandLevelConstraints: NamedConstraint[] =
      formValues.advStandLevelConstraints?.constraints ?? [];

    const formData = {
      max_slope: standLevelConstraints?.max_slope ?? null,
      min_distance_from_road:
        standLevelConstraints?.min_distance_from_road ?? null,
      adv_constraints: advStandLevelConstraints ?? [],
    };
    return formData;
  }

  override beforeStepLoad() {
    console.log('here, we call before step load again');
    this.dataLayersStateService.updateSelectedLayers([]);
    this.dataLayersStateService.setMaxSelectedLayers(MAX_SELECTABLE_LAYERS);
    // ensure that priority_objective layers are unselectable
    this.dataLayersStateService.clearUnselectableLayers();
    this.newScenarioState.scenarioConfig$.pipe(take(1)).subscribe((config) => {
      const draft = config as Partial<ScenarioDraftConfiguration>;

      console.log('this is what draft is now:', draft);
      const priorityIds = (draft.priorities ?? []).map((p) => p.datalayer);
      if (priorityIds && priorityIds.length > 0) {
        this.dataLayersStateService.setUnselectableLayers(
          priorityIds,
          'PRIORITY_OBJECTIVE'
        );
      }
    });
    // send this to the children? or just send the values down as observables?
    this.advConstraintsComponent.mapConfigToUI();
  }

  override beforeStepExit() {
    this.dataLayersStateService.resetAll();
    this.dataLayersStateService.updateSelectedLayers([]);
  }
}
