import { Component, Input, HostBinding } from '@angular/core';
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

export type ScenarioStatus = 'InProgress' | 'Running' | 'Done' | 'Failed';
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
  @Input() status: ScenarioStatus = 'Running';
  @Input() name: string = '';
  @Input() areas: number = 0;
  @Input() budget: number = 0;
  @Input() treatmentPlansCount: number = 0;
  @Input() creator: string = '';
  @Input() created_at: string = '';

  failureMessage: string = 'failureMessage';

  readonly chipsStatus: Record<ScenarioStatus, StatusChipStatus> = {
    InProgress: 'inProgress',
    Done: 'success',
    Running: 'running',
    Failed: 'failed',
  };

  hasFailed(): boolean {
    return this.status === 'Failed';
  }

  isRunning(): boolean {
    return this.status === 'Running';
  }

  isDone(): boolean {
    return this.status === 'Done';
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

  @HostBinding('class.disabled-content')
  get disabledContent() {
    return this.isRunning() || this.hasFailed();
  }

  getChipStatus(): StatusChipStatus {
    return this.chipsStatus[this.status];
  }
}
