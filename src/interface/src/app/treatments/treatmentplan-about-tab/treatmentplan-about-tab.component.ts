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
  @Input() numProjectAreas?: number;
  @Input() numAcres?: number;
  @Input() standSize?: 'SMALL' | 'MEDIUM' | 'LARGE';
}
