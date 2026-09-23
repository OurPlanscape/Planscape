import { CommonModule } from '@angular/common';
import {
  Component,
  Host,
  Input,
  OnDestroy,
  OnInit,
  SkipSelf,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { MAX_SELECTED_DATALAYERS } from '@app/data-layers/data-layers/max-selected-datalayers.token';
import { PlanState } from '@app/plan/plan.state';
import { ScenarioState } from '@app/scenario/scenario.state';
import { MapModuleService } from '@app/services/map-module.service';
import { MAP_MODULE_NAME } from '@app/services/map-module.token';
import { SectionComponent } from '@styleguide';
import { ChipSelectorComponent } from '@styleguide/chip-selector/chip-selector.component';
import {
  AdvStandLevelConstraintsModalComponent,
  NamedConstraint,
} from '../adv-stand-level-constraints-modal/adv-stand-level-constraints-modal.component';
import { ControlContainer, FormControl, FormGroup } from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
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
} from '@app/types';
import { ModuleService } from '@app/services/module.service';
import { SELECTION_MODE } from '@app/data-layers/data-layers/selection-mode.token';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';
import { getOperatorDisplayText } from '@app/scenario/scenario-helper';

@UntilDestroy()
@Component({
  selector: 'app-adv-stand-level-constraints',
  standalone: true,
  providers: [
    DataLayersStateService,
    { provide: SELECTION_MODE, useValue: 'MANUAL' },
    { provide: MAX_SELECTED_DATALAYERS, useValue: Number.POSITIVE_INFINITY },
    MapModuleService,
    { provide: MAP_MODULE_NAME, useValue: 'advanced_stand_level_constraint' },
  ],
  imports: [
    ChipSelectorComponent,
    CommonModule,
    DataLayersComponent,
    SectionComponent,
    MatExpansionModule,
    MatIconModule,
  ],
  templateUrl: './adv-stand-level-constraints.component.html',
  styleUrl: './adv-stand-level-constraints.component.scss',
})
export class AdvStandLevelConstraintsComponent implements OnInit, OnDestroy {
  selectedConstraints$ = new BehaviorSubject<NamedConstraint[]>([]);
  private readonly destroy$ = new Subject<void>();

  activeConstraint$ = new BehaviorSubject<NamedConstraint | null>(null);

  showLayersPanel = false;

  readonly constraintLayers$: Observable<DataLayer[]> = this.moduleService
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

  @Input() constraintLayers: DataLayer[] | null = [];
  @Input() keyName = 'advStandLevelConstraints';

  // single FormControl holding the constraints array
  readonly form = new FormGroup({
    constraints: new FormControl<NamedConstraint[]>([], { nonNullable: true }),
  });
  private knownLayers: DataLayer[] = [];

  // loading state derived from constraintLayers$
  readonly layersLoaded$: Observable<boolean> = this.constraintLayers$.pipe(
    map(() => true),
    startWith(false)
  );

  // Synchronous lookup for UI event handlers
  getFullLayerById(id: number): DataLayer | null {
    return this.knownLayers.find((layer) => layer.id === id) ?? null;
  }

  // TODO: move to a helper?
  private getConstraintDisplayName(
    constraint: Constraint,
    layer: DataLayer | undefined
  ): string {
    const layerName = layer ? layer.name : 'Unknown Layer';
    if (constraint.operator === 'btw' && constraint.value.includes(',')) {
      const [num1, num2] = constraint.value.split(',').map(Number);
      return `${layerName}: ${Math.min(num1, num2)}-${Math.max(num1, num2)}`;
    }
    return `${layerName}: ${getOperatorDisplayText(constraint.operator)} ${constraint.value}`;
  }

  // update UI of this component when the step loads,
  // not eagerly on onInit
  mapConfigToUI() {
    // here, we filter out layers from constraintLayers to find
    // just the configured constraints that match the known Adv Stand Level Constraint layers
    combineLatest([
      //TODO: are we getting draft separately from the config?
      this.newScenarioState.advStandLevelConstraints$,
      this.constraintLayers$.pipe(take(1)),
    ]).subscribe(([constraints, layers]) => {
      console.log('what is the draft constraints now?', constraints);

      if (!constraints) {
        this.selectedConstraints$.next([]);
        return;
      }
      // only collect constraints where we find a match in the subset of Adv Constraint Layers
      const namedConstraints: NamedConstraint[] = constraints.reduce(
        (acc: NamedConstraint[], constraint: Constraint) => {
          const layer = layers.find(
            (l: DataLayer) => l.id === constraint.datalayer
          );

          if (layer) {
            this.dataLayerState.addSelectedLayer(layer);

            acc.push({
              ...constraint,
              name: this.getConstraintDisplayName(constraint, layer),
            });
          }

          return acc;
        },
        []
      );
      this.selectedConstraints$.next(namedConstraints);
    });
  }

  constructor(
    private dialog: MatDialog,
    private mapModuleService: MapModuleService,
    private moduleService: ModuleService,
    private scenarioState: ScenarioState,
    private newScenarioState: NewScenarioState,
    private planState: PlanState,
    private dataLayerState: DataLayersStateService,
    @Host() @SkipSelf() private parentContainer: ControlContainer
  ) {
    this.scenarioState.currentScenario$
      .pipe(
        take(1),
        switchMap(() => this.planState.currentPlan$),
        switchMap((plan) => this.mapModuleService.loadMapModule(plan.geometry))
      )
      .subscribe();

    this.dataLayerState.layerClicked$
      .pipe(untilDestroyed(this))
      .subscribe((layer) => {
        this.handleSelectedLayer(layer);
      });
  }

  ngOnInit(): void {
    // Directly attach to the parent form
    this.parentFormGroup.addControl(this.keyName, this.form);

    // keep form control in sync with selectedConstraints$
    this.selectedConstraints$
      .pipe(takeUntil(this.destroy$))
      .subscribe((constraints) => {
        this.form.controls.constraints.setValue(constraints);
      });
  }

  ngOnDestroy(): void {
    // Clean up parent form and RxJS subscriptions
    this.parentFormGroup.removeControl(this.keyName);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private get parentFormGroup(): FormGroup {
    return this.parentContainer?.control as FormGroup;
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
      this.dataLayerState.addSelectedLayer(layerToAdd);
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
      this.dataLayerState.removeSelectedLayer(removeLayer);
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
}
