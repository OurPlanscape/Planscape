import { Component, Input } from '@angular/core';
import { NgIf, NgSwitch } from '@angular/common';
import {
  StatusChipComponent,
  StatusChipStatus,
} from '../status-chip/status-chip.component';
import { ButtonComponent } from '../button/button.component';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

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
    MatMenuModule,
  ],
  templateUrl: './scenario-card.component.html',
  styleUrl: './scenario-card.component.scss',
})
export class ScenarioCardComponent {
  /**
   * The status
   */
  @Input() scenario: any;
  failureMessage: string = 'failureMessage';

  getChipStatus(): StatusChipStatus {
    switch (this.scenario.status) {
      case 'ACTIVE':
        return 'inProgress';
      case 'RUNNING':
        return 'running';
      case 'DONE':
        return 'success';
      case 'FAILED':
        return 'failed';
      default:
        return 'inProgress';
    }
  }
}
