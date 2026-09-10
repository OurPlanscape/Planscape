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
import { DataLayer } from '@app/types';
import { SectionComponent } from '@styleguide';
import { ChipSelectorComponent } from '@styleguide/chip-selector/chip-selector.component';
import { BehaviorSubject, Subject, switchMap, take, takeUntil } from 'rxjs';
import {
  AdvStandLevelConstraintsModalComponent,
  NamedConstraint,
} from '../adv-stand-level-constraints-modal/adv-stand-level-constraints-modal.component';
import { ControlContainer, FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-adv-stand-level-constraints',
  standalone: true,
  providers: [
    DataLayersStateService,
    { provide: MAX_SELECTED_DATALAYERS, useValue: Number.POSITIVE_INFINITY }, // TODO: should have a no-limit option -- 0 or null?
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

  showLayersPanel = false;

  @Input() constraintLayers: DataLayer[] | null = [];
  @Input() keyName = 'advStandLevelConstraints';

  // 1. Single FormControl holding the array
  readonly form = new FormGroup({
    constraints: new FormControl<NamedConstraint[]>([], { nonNullable: true }),
  });

  constructor(
    private dialog: MatDialog,
    private mapModuleService: MapModuleService,
    private scenarioState: ScenarioState,
    private planState: PlanState,
    @Host() @SkipSelf() private parentContainer: ControlContainer
  ) {
    this.scenarioState.currentScenario$
      .pipe(
        take(1),
        switchMap(() => this.planState.currentPlan$),
        switchMap((plan) => this.mapModuleService.loadMapModule(plan.geometry))
      )
      .subscribe();
  }

  ngOnInit(): void {
    // Directly attach to the parent form
    this.parentFormGroup.addControl(this.keyName, this.form);
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
  }

  handleSelectedLayer(dl: DataLayer | NamedConstraint) {
    const dialogRef = this.dialog.open(AdvStandLevelConstraintsModalComponent, {
      maxWidth: '560px',
      data: {
        dataLayerName: dl.name,
        dataLayer: dl,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.handleConstraintAdded(confirmed);
        }
      });
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

  addConstraint(newConstraint: NamedConstraint): void {
    const current = this.form.controls.constraints.value;
    this.form.controls.constraints.setValue([...current, newConstraint]);
  }

  removeConstraint(index: number): void {
    const current = [...this.form.controls.constraints.value];
    current.splice(index, 1);
    this.form.controls.constraints.setValue(current);
  }

  handleConstraintClicked(e: NamedConstraint) {
    // TODO:
    // get the known layers by Id
    // mark item as selected in chip selector
    // open constraint dialog (and close current if open)

    console.log('clicked this:', e);
    this.handleSelectedLayer(e);
  }
}
