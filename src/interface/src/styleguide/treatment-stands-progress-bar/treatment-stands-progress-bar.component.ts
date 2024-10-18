import { Component, Input } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

/**
 * Treatment Stands Progress Bar component
 *
 */
@Component({
  selector: 'sg-treatment-progress',
  standalone: true,
  imports: [MatProgressBarModule],
  templateUrl: './treatment-stands-progress-bar.component.html',
  styleUrl: './treatment-stands-progress-bar.component.scss',
})
export class TreatmentStandsProgressBarComponent {
  /**
   * Optional title text -- explicitly overrides the derived title
   */
  @Input() title: string | null = null;
  @Input() totalStands: number = 0;
  @Input() treatedStands: number = 0;

  treatedToPercent(): number {
    if (this.treatedStands < 1 || this.totalStands < 1) {
      return 0;
    }
    return Math.round(this.treatedStands / this.totalStands) * 100;
  }
}
