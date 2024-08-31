import { Component, Input } from '@angular/core';
import { AsyncPipe, JsonPipe, NgForOf, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TreatmentsState } from '../treatments.state';

/**
 * placeholder component to display project areas.
 * To be replaced with project area expander
 */
@Component({
  selector: 'app-treatment-summary',
  standalone: true,
  imports: [JsonPipe, NgForOf, NgIf, RouterLink, AsyncPipe],
  templateUrl: './treatment-summary.component.html',
  styleUrl: './treatment-summary.component.scss',
})
export class TreatmentSummaryComponent {
  @Input() treatmentPlanId!: number;
  @Input() projectAreaId?: number;

  summary$ = this.treatmentsState.summary$;

  constructor(private treatmentsState: TreatmentsState) {}
}
