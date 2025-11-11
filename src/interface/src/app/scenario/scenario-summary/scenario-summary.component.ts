import { Component, Input } from '@angular/core';
import { SectionComponent } from '@styleguide';

@Component({
  selector: 'app-scenario-summary',
  standalone: true,
  imports: [SectionComponent],
  templateUrl: './scenario-summary.component.html',
  styleUrl: './scenario-summary.component.scss',
})
export class ScenarioSummaryComponent {
  @Input() title: string = '';

  @Input() treatmentGoal: string = '';

  @Input() standSize: string = '';
}
