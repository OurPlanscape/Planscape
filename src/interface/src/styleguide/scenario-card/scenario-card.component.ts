import { Component, Input } from '@angular/core';
import { NgIf, NgSwitch } from '@angular/common';
import { StatusChipComponent } from '../status-chip/status-chip.component';
import { ButtonComponent } from '../button/button.component';
import { MatIconModule } from '@angular/material/icon';

/**
 * Scenario Card for displaying scenario data in a results list
 */
@Component({
  selector: 'sg-scenario-card',
  standalone: true,
  imports: [
    NgIf,
    NgSwitch,
    StatusChipComponent,
    ButtonComponent,
    MatIconModule,
  ],
  templateUrl: './scenario-card.component.html',
  styleUrl: './scenario-card.component.scss',
})
export class ScenarioCardComponent {
  /**
   * The status
   */
  @Input() scenario: any;
}
