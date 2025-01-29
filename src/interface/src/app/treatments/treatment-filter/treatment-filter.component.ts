import { Component, Input, OnInit } from '@angular/core';
import { TreatmentsState } from '../treatments.state';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MenuCloseReason } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { map, Observable } from 'rxjs';
import {
  descriptionsForAction,
  PrescriptionAction,
  PRESCRIPTIONS,
} from '../prescriptions';
import { ButtonComponent } from '@styleguide';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-treatment-filter',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatMenuModule,
    MatCheckboxModule,
    ButtonComponent,
  ],
  templateUrl: './treatment-filter.component.html',
  styleUrl: './treatment-filter.component.scss',
})
export class TreatmentFilterComponent implements OnInit {
  @Input() disabled: boolean = false;

  unconfirmedSelection: PrescriptionAction[] = [];

  constructor(
    private treatmentsState: TreatmentsState,
    private directImpactsState: DirectImpactsStateService
  ) {}

  treatmentTypeOptions$ = this.treatmentsState.treatmentTypeOptions$;

  sequenceTypeOptions$: Observable<PrescriptionAction[]> =
    this.treatmentsState.treatmentTypeOptions$.pipe(
      map((treatmentTypes: PrescriptionAction[]) => {
        const sequenceActionKeys = Object.keys(PRESCRIPTIONS.SEQUENCE);
        return treatmentTypes.filter((t) => sequenceActionKeys.includes(t));
      })
    );

  singleTypeOptions$ = this.treatmentsState.treatmentTypeOptions$.pipe(
    map((treatmentTypes: PrescriptionAction[]) => {
      const singleActionKeys = Object.keys(PRESCRIPTIONS.SINGLE);
      return treatmentTypes.filter((t) => singleActionKeys.includes(t));
    })
  );

  get selectedItems(): PrescriptionAction[] {
    return this.directImpactsState.getFilteredTreatments() || [];
  }

  ngOnInit(): void {
    this.unconfirmedSelection = [...this.selectedItems];

    this.directImpactsState.filteredTreatmentTypes$
      .pipe(untilDestroyed(this))
      .subscribe((selection) => {
        this.unconfirmedSelection = [...selection];
      });
  }

  getActionLabel(key: PrescriptionAction): any {
    return descriptionsForAction(key);
  }

  hasSelections(): boolean {
    return this.unconfirmedSelection.length > 0;
  }

  get selectionText(): string {
    if (this.unconfirmedSelection.length > 0) {
      const displayedSelections = this.unconfirmedSelection.map((key) => {
        return this.getActionLabel(key);
      });
      return `: ${displayedSelections.join(', ')}`;
    }
    return '';
  }

  clearAndConfirmSelections(e: Event): void {
    // When we click the "X" we want to clear the selection and confirm it.
    e.stopPropagation();
    this.unconfirmedSelection = [];
    this.directImpactsState.setFilteredTreatmentTypes([
      ...this.unconfirmedSelection,
    ]);
  }

  handleClosedMenu(e: MenuCloseReason): void {
    this.handleCancel();
  }

  handleCancel() {
    // If we select some items, but we click outside the menu, that cancel our selection and keep it as it was.
    this.unconfirmedSelection = [];
    this.unconfirmedSelection = [...this.selectedItems];
  }

  clearSelections(event: any) {
    event.stopPropagation();
    this.unconfirmedSelection = [];
  }

  applyChanges() {
    this.directImpactsState.setFilteredTreatmentTypes([
      ...this.unconfirmedSelection,
    ]);
  }

  isInSelection(item: any): boolean {
    return this.unconfirmedSelection.includes(item);
  }

  toggleSelection(e: Event, item: PrescriptionAction) {
    if (!this.unconfirmedSelection.includes(item)) {
      this.unconfirmedSelection.push(item);
    } else {
      this.unconfirmedSelection = this.unconfirmedSelection.filter(
        (e) => e !== item
      );
    }
    e.stopPropagation();
  }
}
