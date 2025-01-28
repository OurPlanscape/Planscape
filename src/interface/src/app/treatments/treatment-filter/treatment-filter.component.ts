import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TreatmentsState } from '../treatments.state';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MenuCloseReason } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { map } from 'rxjs';
import { descriptionsForAction, PRESCRIPTIONS } from '../prescriptions';
import { ButtonComponent } from '@styleguide';

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
export class TreatmentFilterComponent {
  @Input() selectedItems: string[] = [];
  @Input() disabled: boolean = false;
  @Input() menuLabel: string = 'Select';
  @Output() confirmedSelection = new EventEmitter<string[]>();

  private previousSelections: string[] = [];

  constructor(private treatmentsState: TreatmentsState) {}

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

  getActionLabel(key: string): any {
    return descriptionsForAction(key);
  }
  hasSelections(): boolean {
    return this.selectedItems.length > 0;
  }

  get selectionText(): string {
    if (this.selectedItems.length > 0) {
      const displayedSelections = this.selectedItems.map((key) => {
        return this.getActionLabel(key);
      });
      return `: ${displayedSelections.join(', ')}`;
    }
    return '';
  }

  clearAndConfirmSelections(e: Event): void {
    this.clearSelections(e);
    this.confirmedSelection.emit(this.selectedItems);
  }

  handleClosedMenu(e: MenuCloseReason): void {
    // if menu was closed because of the apply button,
    // we don't cancel the selections
    if (e !== 'click') {
      this.handleCancel();
    }
  }

  handleCancel() {
    this.selectedItems = this.previousSelections.slice();
    this.previousSelections = [];
  }

  clearSelections(event: any) {
    this.previousSelections = [];
  }

  applyChanges(e: Event) {
    this.confirmedSelection.emit(this.selectedItems);
  }

  isInSelection(item: any): boolean {
    return this.selectedItems.includes(item);
  }

  toggleSelection(e: Event, item: string) {
    if (!this.selectedItems.includes(item)) {
      this.selectedItems.push(item);
    } else {
      this.selectedItems = this.selectedItems.filter((e) => e !== item);
    }
    e.stopPropagation();
  }
}
