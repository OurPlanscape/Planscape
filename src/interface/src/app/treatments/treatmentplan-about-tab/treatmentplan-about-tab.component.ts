import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { DecimalPipe } from '@angular/common';
import { TreatmentsState } from '../treatments.state';

@Component({
  selector: 'app-treatmentplan-about-tab',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, NgIf],
  templateUrl: './treatmentplan-about-tab.component.html',
  styleUrl: './treatmentplan-about-tab.component.scss',
})
export class TreatmentplanAboutTabComponent {
  constructor(private treatmentsState: TreatmentsState) {}

  treatmentPlan$ = this.treatmentsState.treatmentPlan$;
  summary$ = this.treatmentsState.summary$;
}
