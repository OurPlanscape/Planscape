import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { Prescription, TreatmentProjectArea } from '@types';
import {
  PRESCRIPTIONS,
  PrescriptionSequenceAction,
  PrescriptionSingleAction,
  SequenceAttributes,
} from '@treatments/prescriptions';
import { HighlighterDirective } from '@styleguide/highlighter/highlighter.directive';

/**
 * Search Result Card Component
 * A component to be used in the left panel to highlight matching results
 */
@Component({
  selector: 'sg-search-result-card',
  standalone: true,
  imports: [
    MatExpansionModule,
    MatIconModule,
    NgIf,
    NgFor,
    HighlighterDirective,
  ],
  templateUrl: './search-result-card.component.html',
  styleUrl: './search-result-card.component.scss',
})
export class SearchResultCardComponent {
  @Input() projectArea!: TreatmentProjectArea;
  @Input() searchString: string = '';
  @Input() wholeWordsOnly: boolean = false;
  @Output() cardClick = new EventEmitter();

  extractProjectTitle() {
    return this.projectArea.project_area_name;
  }

  handleClick(event: Event) {
    this.cardClick.emit(true);
  }

  treatmentIsSingle(rx: Prescription) {
    return rx.type === 'SINGLE';
  }

  singleRxText(rx: Prescription): string {
    return PRESCRIPTIONS.SINGLE[rx.action as PrescriptionSingleAction];
  }

  singleRxMatches(rx: Prescription): boolean {
    const action = PRESCRIPTIONS.SINGLE[rx.action as PrescriptionSingleAction];
    return action.toLowerCase().includes(this.searchString.toLowerCase());
  }

  sequenceRxAttributes(rx: Prescription): SequenceAttributes[] {
    return PRESCRIPTIONS.SEQUENCE[rx.action as PrescriptionSequenceAction];
  }

  sequenceDescriptionMatches(d: string): boolean {
    return d.toLowerCase().includes(this.searchString.toLowerCase());
  }
}
