import { Component, HostBinding, Input, OnInit } from '@angular/core';
import { TreatmentsState } from '../treatments.state';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MenuCloseReason } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { map } from 'rxjs';
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
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  menuLabel: string = 'Treatment Type';

  unconfirmedSelection: PrescriptionAction[] = [];

  constructor(
    private treatmentsState: TreatmentsState,
    private directImpactsState: DirectImpactsStateService
  ) {}

  treatmentTypeOptions$ = this.treatmentsState.treatmentTypeOptions$;

  sequenceTypeOptions$ = this.treatmentsState.treatmentTypeOptions$.pipe(
    map((treatmentTypes: string[]) => {
      const sequenceActionKeys = Object.keys(PRESCRIPTIONS.SEQUENCE);
      return treatmentTypes.filter((t) => sequenceActionKeys.includes(t));
    })
  );

  singleTypeOptions$ = this.treatmentsState.treatmentTypeOptions$.pipe(
    map((treatmentTypes: string[]) => {
      const singleActionKeys = Object.keys(PRESCRIPTIONS.SINGLE);
      return treatmentTypes.filter((t) => singleActionKeys.includes(t));
    })
  );

  get selectedItems() {
    return this.directImpactsState.getFilteredTreatments();
  }

  ngOnInit(): void {
    this.unconfirmedSelection = [...this.selectedItems];

    this.directImpactsState.filteredTreatmentTypes$
      .pipe(untilDestroyed(this))
      .subscribe((selection) => {
        this.unconfirmedSelection = [...selection];
      });
  }

  getActionLabel(key: string): any {
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
    // if menu was closed because of the apply button,
    // we don't cancel the selections
    if (e !== 'click') {
      this.handleCancel();
    }
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
      ...(this.unconfirmedSelection as PrescriptionAction[]),
    ]);
  }

  isInSelection(item: any): boolean {
    return this.unconfirmedSelection.includes(item);
  }

  toggleSelection(e: Event, item: string) {
    if (!this.unconfirmedSelection.includes(item as PrescriptionAction)) {
      this.unconfirmedSelection.push(item as PrescriptionAction);
    } else {
      this.unconfirmedSelection = this.unconfirmedSelection.filter(
        (e) => e !== item
      );
    }
    e.stopPropagation();
  }

  @HostBinding('class.small')
  get isSmall() {
    return this.size === 'small';
  }

  @HostBinding('class.medium')
  get isMedium() {
    return this.size === 'medium';
  }

  @HostBinding('class.large')
  get isLarge() {
    return this.size === 'large';
  }
}
