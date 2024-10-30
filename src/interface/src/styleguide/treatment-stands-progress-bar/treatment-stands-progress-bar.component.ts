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
   * Optional title text, if than the default
   */
  @Input() title = 'Stands With Treatments Applied';
  /**
   * The number of treated stands
   */
  @Input() treatedStands?: number | null = 0;
  /**
   * The total number of stands, treated and not treated
   */
  @Input() totalStands?: number | null = 0;

  // convert to units for progress bar
  treatedAsPercent(): number {
    if (
      typeof this.treatedStands !== 'number' ||
      typeof this.totalStands !== 'number' ||
      this.treatedStands < 1 ||
      this.totalStands < 1
    ) {
      return 0;
    }
    return Math.round((this.treatedStands / this.totalStands) * 100);
  }
}
