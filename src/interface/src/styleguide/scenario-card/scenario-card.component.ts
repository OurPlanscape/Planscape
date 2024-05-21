import { Component, Input } from '@angular/core';
import {
  DatePipe,
  CurrencyPipe,
  NgIf,
  NgSwitch,
  NgClass,
} from '@angular/common';
import {
  StatusChipComponent,
  StatusChipStatus,
} from '../status-chip/status-chip.component';
import { ButtonComponent } from '../button/button.component';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Scenario, ScenarioResultStatus } from '@types';

/**
 * Scenario Card for displaying scenario data in a results list
 */
@Component({
  selector: 'sg-scenario-card',
  standalone: true,
  imports: [
    DatePipe,
    NgIf,
    CurrencyPipe,
    NgSwitch,
    NgClass,
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
  @Input() scenario!: Scenario;
  failureMessage: string = 'failureMessage';

  getResultStatus(): ScenarioResultStatus | undefined {
    return this.scenario.scenario_result?.status;
  }

  hasFailed(): boolean {
    const resultStatus = this.scenario.scenario_result?.status;
    if (typeof resultStatus === 'string') {
      return resultStatus in ['FAILURE', 'PANIC', 'TIMED_OUT'];
    }
    return false;
  }

  isRunning(): boolean {
    const resultStatus = this.scenario.scenario_result?.status;
    if (typeof resultStatus === 'string') {
      return resultStatus in ['PENDING', 'RUNNING'];
    }
    return false;
  }

  isDone(): boolean {
    const resultStatus = this.scenario.scenario_result?.status;
    if (typeof resultStatus === 'string') {
      return resultStatus in ['SUCCESS'];
    }
    return false;
  }

  getTreatmentPlansCount(): number {
    return 0;
  }

  getBudget(): number {
    if (this.scenario.configuration.est_cost)
      return this.scenario.configuration.est_cost;
    return 0;
  }

  getAreasCount(): number {
    if (this.scenario.configuration.project_areas)
      return this.scenario.configuration.project_areas.length;
    return 0;
  }

  getChipStatus(): StatusChipStatus {
    switch (this.scenario.scenario_result?.status) {
      case 'LOADING':
        return 'inProgress';
      case 'NOT_STARTED':
        return 'inProgress';
      case 'PENDING':
        return 'running';
      case 'RUNNING':
        return 'running';
      case 'SUCCESS':
        return 'success';
      case 'FAILURE':
        return 'failed';
      case 'PANIC':
        return 'failed';
      case 'TIMED_OUT':
        return 'failed';
      default:
        return 'inProgress';
    }
  }
}
