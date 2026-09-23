import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  AdvStandLevelConstraintData,
  ApiModule,
  Constraint,
  DataLayer,
  ScenarioDraftConfiguration,
} from '@app/types';
import { StepDirective } from '@styleguide';
import { AdvStandLevelConstraintsComponent } from '../step3/adv-stand-level-constraints/adv-stand-level-constraints.component';
import { StandLevelConstraintsComponent } from '../step3/stand-level-constraints.component';
import { FeaturesModule } from '@app/features/features.module';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { NewScenarioState } from '../new-scenario.state';
import {
  catchError,
  combineLatest,
  map,
  Observable,
  of,
  shareReplay,
  take,
  tap,
} from 'rxjs';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ModuleService } from '@app/services/module.service';
import { NamedConstraint } from '../step3/adv-stand-level-constraints-modal/adv-stand-level-constraints-modal.component';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { getOperatorDisplayText } from '@app/scenario/scenario-helper';

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

  // TODO: maybe move this and selectedAdvStandLevelConstraints to the child...?
  // This calls the module service to collect the known Adv SLC layers
  advStandLevelConstraintLayers$: Observable<DataLayer[]> = this.moduleService
    .getModule<
      ApiModule<AdvStandLevelConstraintData>
    >('advanced_stand_level_constraint')
    .pipe(
      map((data) => data.options.datalayers),
      tap((layers) => {
        return layers;
      }),
      shareReplay(1)
    );

  // from all of the many constraints[] that may exist, we filter out
  // just the constraints that match the known Adv Stand Level Constraint layers
  selectedAdvStandLevelConstraints$ = combineLatest([
    this.newScenarioState.scenarioConfig$,
    this.advStandLevelConstraintLayers$,
  ]).pipe(
    untilDestroyed(this),
    map(([config, advSLCLayers]) => {
      const constraints = config.constraints;
      if (constraints) {
        const namedConstraints: NamedConstraint[] = constraints.map(
          (constraint: Constraint) => {
            const layer = advSLCLayers.find(
              (l: DataLayer) => l.id === constraint.datalayer
            );
            // TODO: make a consistent helper function for this
            let constraintName = `${layer ? layer.name : 'Unknown Layer'}: ${getOperatorDisplayText(constraint.operator)} ${constraint.value}`;
            if (constraint.operator === 'btw') {
              constraintName = `${layer ? layer.name : 'Unknown Layer'}: ${constraint.value}-${constraint.value2}`;
            }
            return {
              ...constraint,
              name: constraintName, // Fallback name if missing
            };
          }
        );
        return namedConstraints.length ? namedConstraints : [];
      } else {
        return [];
      }
    }),
    catchError(() => {
      return of([]);
    })
  );

  constructor(
    private moduleService: ModuleService,
    private dataLayersStateService: DataLayersStateService,
    private newScenarioState: NewScenarioState
  ) {
    super();
  }

  getData(): Partial<ScenarioDraftConfiguration> {
    const formValues = this.form.getRawValue();
    console.log('here are the form values:', formValues);

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
    // TODO: in the getData call, map the draftconfig to the PATCH call
    console.log('here is the form data:', formData);
    return formData;
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
