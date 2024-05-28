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
export type ScenarioStatus = 'Running' | 'Done' | 'Failed';
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
  @Input() status: ScenarioStatus = 'Running';
  @Input() name = '';
  @Input() areas = 0;
  @Input() budget = 0;
  @Input() treatmentPlansCount = 0;
  @Input() creator = '';
  @Input() created_at = '';

  @Output() openScenario = new EventEmitter();
  @Output() openPlanningProgress = new EventEmitter();
  @Output() archiveScenario = new EventEmitter();

  readonly chipsStatus: Record<ScenarioStatus, StatusChipStatus> = {
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

  @HostBinding('class.disabled-content')
  get disabledContent() {
    return this.isRunning();
  }

  getChipStatus(): StatusChipStatus {
    return this.chipsStatus[this.status];
  }
}
