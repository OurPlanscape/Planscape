import {
  Component,
  Input,
  HostBinding,
  Output,
  EventEmitter,
} from '@angular/core';
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
import { MatButtonModule } from '@angular/material/button';
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
    MatButtonModule,
  ],
  templateUrl: './scenario-card.component.html',
  styleUrl: './scenario-card.component.scss',
})
export class ScenarioCardComponent {
  //TODO: maybe we need to accept the ID here, so we can emit events for these scenarios?
  @Input() status: ScenarioStatus = 'Running';
  @Input() name = '';
  @Input() areas = 0;
  @Input() budget = 0;
  @Input() treatmentPlansCount = 0;
  @Input() creator = '';
  @Input() created_at = '';

  @Output() openScenarioEvent = new EventEmitter<number>();
  @Output() openPlanningProgressEvent = new EventEmitter<number>();
  @Output() archiveScenarioEvent = new EventEmitter<number>();
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

  openScenario() {
    this.openScenarioEvent.emit();
  }

  openPlanningProgress() {
    this.openPlanningProgressEvent.emit();
  }

  archiveScenario() {
    this.archiveScenarioEvent.emit();
  }

  @HostBinding('class.disabled-content')
  get disabledContent() {
    return this.isRunning() || this.hasFailed();
  }

  getChipStatus(): StatusChipStatus {
    return this.chipsStatus[this.status];
  }
}
