import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-scenario-tooltip',
  templateUrl: './scenario-tooltip.component.html',
  styleUrls: ['./scenario-tooltip.component.scss'],
})
export class ScenarioTooltipComponent {
  @Input() title = '';
  @Input() area: 'TREATMENT_GOALS' | 'CONSTRAINTS' | 'EXCLUDE_AREAS' =
    'TREATMENT_GOALS';
}
