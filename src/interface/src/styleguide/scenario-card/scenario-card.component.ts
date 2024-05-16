import { Component, Input } from '@angular/core';
import { NgIf, NgSwitch } from '@angular/common';

/**
 * Scenario Card for displaying scenario data in a results list
 */
@Component({
  selector: 'sg-scenario-card',
  standalone: true,
  imports: [NgIf, NgSwitch],
  templateUrl: './scenario-card.component.html',
  styleUrl: './scenario-card.component.scss',
})
export class ScenarioCardComponent {
  /**
   * The status
   */
  @Input() scenario: any;
}
