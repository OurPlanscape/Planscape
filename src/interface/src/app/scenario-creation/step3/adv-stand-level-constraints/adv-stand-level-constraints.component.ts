import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { DataLayersRailComponent } from '@data-layers/data-layers-rail/data-layers-rail.component';
import { FeaturesModule } from '@features/features.module';
import { PlanState } from '@app/plan/plan.state';
import { ScenarioState } from '@app/scenario/scenario.state';
import { MapModuleService } from '@app/services/map-module.service';
import {
  ButtonComponent,
  PopoverComponent,
  SectionComponent,
  StepDirective,
} from '@styleguide';
import { ChipSelectorComponent } from '@styleguide/chip-selector/chip-selector.component';
import {
  AdvStandLevelConstraintsModalComponent,
  NamedConstraint,
} from '../adv-stand-level-constraints-modal/adv-stand-level-constraints-modal.component';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs';
import {
  ApiModule,
  DataLayer,
  AdvStandLevelConstraintData,
  Constraint,
  ScenarioDraftConfiguration,
} from '@app/types';
import { ModuleService } from '@app/services/module.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';
import { getConstraintDisplayName } from '@app/scenario/scenario-helper';
import { ForsysService } from '@app/services/forsys.service';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';

const MAX_SELECTABLE_LAYERS = Number.POSITIVE_INFINITY;

@UntilDestroy()
@Component({
  selector: 'app-adv-stand-level-constraints',
  standalone: true,
  providers: [
    { provide: StepDirective, useExisting: AdvStandLevelConstraintsComponent },
  ],
  imports: [
    ButtonComponent,
    ChipSelectorComponent,
    CommonModule,
    DataLayersComponent,
    DataLayersRailComponent,
    FeaturesModule,
    PopoverComponent,
    SectionComponent,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    CommonModule,
    SectionComponent,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './adv-stand-level-constraints.component.html',
  styleUrl: './adv-stand-level-constraints.component.scss',
})
export class AdvStandLevelConstraintsComponent
  extends StepDirective<ScenarioDraftConfiguration>
  implements OnInit, OnDestroy
{
  selectedConstraints$ = new BehaviorSubject<NamedConstraint[]>([]);
  private readonly destroy$ = new Subject<void>();

  activeConstraint$ = new BehaviorSubject<NamedConstraint | null>(null);

  showLayersPanel = false;

  readonly advStandLevelConstraintLayers$: Observable<DataLayer[]> =
    this.moduleService
      .getModule<
        ApiModule<AdvStandLevelConstraintData>
      >('advanced_stand_level_constraint')
      .pipe(
        map((data) => data.options.datalayers),
        tap((layers) => {
          this.knownLayers = layers;
          return layers;
        }),
        shareReplay(1)
      );

  form = new FormGroup({
    max_slope: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(100),
    ]),
    min_distance_from_road: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(100000),
    ]),
    constraints: new FormControl<NamedConstraint[]>([], { nonNullable: true }),
  });

  private knownLayers: DataLayer[] = [];

  // loading state derived from advStandLevelConstraintLayers$
  readonly layersLoaded$: Observable<boolean> =
    this.advStandLevelConstraintLayers$.pipe(
      map(() => true),
      startWith(false)
    );

  // Synchronous lookup for UI event handlers
  getFullLayerById(id: number): DataLayer | null {
    return this.knownLayers.find((layer) => layer.id === id) ?? null;
  }

  // update UI of this component when the step loads, not eagerly on step construction
  mapConfigToUI() {
    combineLatest([
      this.newScenarioState.advConstraints$,
      this.advStandLevelConstraintLayers$,
    ])
      .pipe(take(1))
      .subscribe(([constraints, layers]) => {
        if (!constraints) {
          this.selectedConstraints$.next([]);
          return;
        }

        const namedConstraints: NamedConstraint[] = constraints.reduce<
          NamedConstraint[]
        >((acc, constraint: Constraint) => {
          const layer = layers.find((l) => l.id === constraint.datalayer);
          if (layer) {
            this.dataLayersStateService.addSelectedLayer(layer);
            acc.push({
              ...constraint,
              name: getConstraintDisplayName(constraint, layer),
            });
          }
          return acc;
        }, []);

        this.selectedConstraints$.next(namedConstraints);
      });
  }

  constructor(
    private dialog: MatDialog,
    private mapModuleService: MapModuleService,
    private moduleService: ModuleService,
    private scenarioState: ScenarioState,
    private planState: PlanState,
    private dataLayersStateService: DataLayersStateService,
    private newScenarioState: NewScenarioState,
    private forsysService: ForsysService
  ) {
    super();

    this.scenarioState.currentScenario$
      .pipe(
        take(1),
        switchMap(() => this.planState.currentPlan$),
        switchMap((plan) => this.mapModuleService.loadMapModule(plan.geometry))
      )
      .subscribe();

    this.dataLayersStateService.layerClicked$
      .pipe(untilDestroyed(this))
      .subscribe((layer) => {
        this.handleSelectedLayer(layer);
      });
  }

  ngOnInit(): void {
    this.forsysService.forsysData$
      .pipe(
        take(1),
        switchMap((forsysData) =>
          this.form.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            map((data: any) => {
              if (this.form.valid) {
                const constraints: Constraint[] = [];
                if (!(data.max_slope === null || data.max_slope === '')) {
                  constraints.push({
                    datalayer: forsysData.thresholds.slope.id,
                    operator: 'lte',
                    value: data.max_slope,
                  });
                }
                if (
                  !(
                    data.min_distance_from_road === null ||
                    data.min_distance_from_road === ''
                  )
                ) {
                  constraints.push({
                    datalayer: forsysData.thresholds.distance_from_roads.id,
                    operator: 'lte',
                    value: data.min_distance_from_road,
                  });
                }
                this.newScenarioState.setConstraints(constraints);
              }
            })
          )
        )
      )
      .subscribe();

    this.newScenarioState.scenarioConfig$
      .pipe(
        untilDestroyed(this),
        filter((c) => !!c?.constraints),
        take(1),
        switchMap((config) =>
          this.forsysService.forsysData$.pipe(
            map((data) => {
              const slope = config.constraints?.find(
                (c) => c.datalayer === data.thresholds.slope.id
              );
              if (slope) {
                this.form.get('max_slope')?.setValue(Number(slope.value));
              }

              const distance = config.constraints?.find(
                (c) => c.datalayer === data.thresholds.distance_from_roads.id
              );
              if (distance) {
                this.form
                  .get('min_distance_from_road')
                  ?.setValue(Number(distance.value));
              }

              return config;
            })
          )
        )
      )
      .subscribe((config) => {});

    // keep form control in sync with selectedConstraints$
    this.selectedConstraints$
      .pipe(takeUntil(this.destroy$))
      .subscribe((constraints) => {
        this.form.controls.constraints.setValue(constraints);
      });
  }

  ngOnDestroy(): void {
    // reset dataLayersStateService to normal:
    this.dataLayersStateService.setSelectionMode('AUTOMATIC');
    this.destroy$.next();
    this.destroy$.complete();
  }

  public handleConstraintAdded(constraint: NamedConstraint): void {
    const current = [...this.selectedConstraints$.value];
    const existingIndex = current.findIndex((c) => c.name === constraint.name);

    if (existingIndex === -1) {
      current.push(constraint);
    } else {
      current[existingIndex] = constraint;
    }
    this.selectedConstraints$.next(current);
    const layerToAdd = this.getFullLayerById(constraint.datalayer);
    if (layerToAdd) {
      this.dataLayersStateService.addSelectedLayer(layerToAdd);
    }
  }

  public handleUpdateConstraint(constraint: NamedConstraint) {
    const current = this.selectedConstraints$.value;
    const exists = current.some((c) => c.datalayer === constraint.datalayer);
    if (exists) {
      const updated = current.map((c) =>
        c.datalayer === constraint.datalayer ? { ...c, ...constraint } : c
      );
      this.selectedConstraints$.next(updated);
    }
  }

  removeSelectionById(id: number) {
    const currentSelections = this.selectedConstraints$.value;
    const updatedItems = currentSelections.filter(
      (item) => item.datalayer !== id
    );
    this.selectedConstraints$.next(updatedItems);

    const removeLayer = this.getFullLayerById(id);
    if (removeLayer) {
      this.dataLayersStateService.removeSelectedLayer(removeLayer);
    }
  }

  handleSelectedLayer(dl: DataLayer) {
    // Check if the layer is in our current constraint list.
    const currentSelections = this.selectedConstraints$.value;
    if (currentSelections.some((curSel) => curSel.datalayer === dl.id)) {
      // then just remove it...
      this.removeSelectionById(dl.id);
    } else {
      const dialogRef = this.dialog.open(
        AdvStandLevelConstraintsModalComponent,
        {
          maxWidth: '560px',
          data: {
            dataLayerName: dl.name,
            dataLayer: dl,
          },
        }
      );

      dialogRef
        .afterClosed()
        .pipe(take(1))
        .subscribe((closeResult) => {
          if (closeResult.action === 'SAVE') {
            this.handleConstraintAdded(closeResult.payload);
          } else if (closeResult.action === 'DELETE') {
            this.removeSelectionById(closeResult.payload);
          }
        });
    }
  }

  public handleConstraintRemoved(constraintName: string): void {
    const current = this.selectedConstraints$.value.filter(
      (c) => c.name !== constraintName
    );
    this.selectedConstraints$.next(current);
  }

  toggleLayersSection() {
    this.showLayersPanel = !this.showLayersPanel;
  }

  handleConstraintChipClicked(e: NamedConstraint) {
    this.activeConstraint$.next(e);

    const layerRecord = this.getFullLayerById(e.datalayer);
    if (!layerRecord) {
      return;
    }
    let valueOne = e.value;
    let valueTwo = null;

    if (e.value.includes(',')) {
      const [num1, num2] = e.value.split(',').map(Number);
      // guard against values being out of numeric order
      valueOne = String(Math.min(num1, num2));
      valueTwo = String(Math.max(num1, num2));
    }

    const dialogRef = this.dialog.open(AdvStandLevelConstraintsModalComponent, {
      maxWidth: '560px',
      data: {
        mode: 'EDIT',
        dataLayerName: layerRecord.name,
        dataLayer: layerRecord,
        operator: e.operator,
        valueOne: valueOne,
        valueTwo: valueTwo,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((closeResult) => {
        this.activeConstraint$.next(null);
        if (closeResult.action === 'SAVE') {
          this.handleUpdateConstraint(closeResult.payload);
        } else if (closeResult.action === 'DELETE') {
          this.removeSelectionById(closeResult.payload.id);
        }
      });
  }

  getData(): Partial<ScenarioDraftConfiguration> {
    const formValues = this.form.getRawValue();
    const formData = {
      max_slope: formValues.max_slope ?? null,
      min_distance_from_road: formValues.min_distance_from_road ?? null,
      adv_constraints: formValues.constraints ?? [],
    };
    return formData;
  }

  override beforeStepLoad() {
    this.dataLayersStateService.updateSelectedLayers([]);
    this.dataLayersStateService.setMaxSelectedLayers(MAX_SELECTABLE_LAYERS);
    this.dataLayersStateService.setSelectionMode('MANUAL');
    this.dataLayersStateService.clearUnselectableLayers();
    this.dataLayersStateService.setModuleNameOverride(
      'advanced_stand_level_constraint'
    );
    this.mapConfigToUI();
  }

  override beforeStepExit() {
    this.dataLayersStateService.setSelectionMode('AUTOMATIC');
    this.dataLayersStateService.setModuleNameOverride(null);
    this.dataLayersStateService.resetAll();
    this.dataLayersStateService.updateSelectedLayers([]);
  }
}
