import { Component, Input } from '@angular/core';
import {
  DatePipe,
  CurrencyPipe,
  NgIf,
  NgSwitch,
  NgClass,
} from '@angular/common';
import { StatusChipComponent } from '../status-chip/status-chip.component';
import { ButtonComponent } from '../button/button.component';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

/**
 * Scenario Card for displaying scenario data in a results list
 */
export type ScenarioStatus = 'inProgress' | 'success' | 'failed' | 'running';
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
  @Input() status: ScenarioStatus = 'inProgress';
  @Input() name: string = '';
  @Input() areas: number = 0;
  @Input() budget: number = 0;
  @Input() treatmentPlansCount: number = 0;
  @Input() creator: string = '';
  @Input() created_at: string = '';

  failureMessage: string = 'failureMessage';
  // const chipStatusForScenarioStatus : Record<ScenarioStatus, StatusChipStatus> = {....}

  hasFailed(): boolean {
    return this.status === 'failed';
  }

  isRunning(): boolean {
    return this.status === 'running';
  }

  isDone(): boolean {
    return this.status === 'success';
  }

  getTreatmentPlansCount(): number {
    return this.treatmentPlansCount;
  }

  getBudget(): number {
    return this.budget;
  }

  getAreasCount(): number {
    return this.areas;
  }
}
