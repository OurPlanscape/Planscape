import { Component, Input } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { TreatmentTypeIconComponent } from '../treatment-type-icon/treatment-type-icon.component';
import { SequenceIconComponent } from '../sequence-icon/sequence-icon.component';
import { TreatmentProjectArea } from 'src/app/types';
import {
  PRESCRIPTIONS,
  PrescriptionSingleAction,
  PrescriptionSequenceAction,
} from '../../app/treatments/prescriptions';
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
    NgClass,
    NgIf,
    NgFor,
    SequenceIconComponent,
    TreatmentTypeIconComponent,
  ],
  templateUrl: './search-result-card.component.html',
  styleUrl: './search-result-card.component.scss',
})
export class SearchResultCardComponent {
  @Input() projectArea!: TreatmentProjectArea;
  @Input() searchString: string = '';
  @Input() wholeWordsOnly: boolean = false;

  extractProjectTitle() {
    return this.projectArea.project_area_name;
  }

  extractProjectLines(): string[] {
    const lines = this.projectArea.prescriptions.map((rx) => {
      if (rx.type === 'SINGLE') {
        return PRESCRIPTIONS.SINGLE[rx.action as PrescriptionSingleAction];
      } else if (rx.type === 'SEQUENCE')
        return PRESCRIPTIONS.SEQUENCE[rx.action as PrescriptionSequenceAction]
          .name;
      else return '';
    });

    return lines.filter((t) =>
      t.toLowerCase().includes(this.searchString.toLowerCase())
    );
  }

  // split on string, but retain search string
  _splitRetain(haystack: string, needle: string) {
    const regex = new RegExp(`(${needle})`, 'g');
    return haystack.split(regex).filter(Boolean);
  }

  // we split the text into segments using the searchTerm
  // And then in the template, we highlight any matching segments
  splitTextLine(textLine: string): string[] | null {
    if (!this.searchString) return [textLine];

    return this._splitRetain(textLine, this.searchString);
  }

  isMatch(part: string): boolean {
    if (!this.searchString) return false;
    return part.toLowerCase() === this.searchString.toLowerCase();
  }
}
