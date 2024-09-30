import { Input, Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-treatmentplan-about-tab',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './treatmentplan-about-tab.component.html',
  styleUrl: './treatmentplan-about-tab.component.scss',
})
export class TreatmentplanAboutTabComponent {
  @Input() numProjectAreas?: number = 1000;
  @Input() numAcres?: number = 2400000;
  @Input() standSize?: string = 'SMALL';

  loadTreatmentPlan(): void {}
}
