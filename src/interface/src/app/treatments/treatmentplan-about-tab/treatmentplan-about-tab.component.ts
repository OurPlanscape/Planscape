import { Input, Component } from '@angular/core';

@Component({
  selector: 'app-treatmentplan-about-tab',
  standalone: true,
  imports: [],
  templateUrl: './treatmentplan-about-tab.component.html',
  styleUrl: './treatmentplan-about-tab.component.scss',
})
export class TreatmentplanAboutTabComponent {
  @Input() numProjectAreas?: number;
  @Input() numAcres?: number;
  @Input() standSize?: number;

  loadTreatmentPlan(): void {}
}
