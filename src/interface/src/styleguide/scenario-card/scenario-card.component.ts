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

export type ScenarioResultLabel = 'Done' | 'Running' | 'Failed';

// redefining this works, but including it kills storybook?
export type ScenarioResultStatus =
  | 'LOADING' // when loading results
  | 'NOT_STARTED' // Added by FE when the scenario is not created yet.
  | 'PENDING' // Scenario created, in queue
  | 'RUNNING' // Scenario created, being processed
  | 'SUCCESS' // Run completed successfully
  | 'FAILURE' // Run failed;
  | 'PANIC' // Run failed; panic
  | 'TIMED_OUT'; // Run failed; timed out

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
  @Input() status: ScenarioResultStatus | undefined = 'SUCCESS';
  @Input() name = '';
  @Input() areas? = 0;
  @Input() budget? = 0;
  @Input() treatmentPlansCount?: number | undefined = 0;
  @Input() creator?: string | undefined = '';
  @Input() created_at? = '';
  @Input() selected?: boolean = false;

  @Output() openScenario = new EventEmitter();
  @Output() openPlanningProgress = new EventEmitter();
  @Output() archiveScenario = new EventEmitter();
  @Output() clicked = new EventEmitter();

  readonly chipsStatus: Record<ScenarioResultStatus, StatusChipStatus> = {
    FAILURE: 'failed',
    LOADING: 'running',
    NOT_STARTED: 'running',
    PANIC: 'failed',
    PENDING: 'running',
    RUNNING: 'running',
    SUCCESS: 'success',
    TIMED_OUT: 'failed',
  };

  readonly chipLabel: Record<ScenarioResultStatus, ScenarioResultLabel> = {
    FAILURE: 'Failed',
    LOADING: 'Running',
    NOT_STARTED: 'Running',
    PANIC: 'Failed',
    PENDING: 'Running',
    RUNNING: 'Running',
    SUCCESS: 'Done',
    TIMED_OUT: 'Failed',
  };

  hasFailed(): boolean {
    if (this.status) {
      return this.chipsStatus[this.status] == 'failed';
    }
    return false;
  }

  isRunning(): boolean {
    if (this.status) {
      return this.chipsStatus[this.status] == 'running';
    }
    return false;
  }

  isDone(): boolean {
    if (this.status) {
      return this.chipsStatus[this.status] == 'success';
    }
    return false;
  }

  @HostBinding('class.disabled-content')
  get disabledContent() {
    return this.isRunning();
  }

  @HostBinding('class.selected')
  get isSelected() {
    return this.selected;
  }

  getChipStatus(): StatusChipStatus {
    if (this.status) {
      return this.chipsStatus[this.status];
    }
    return 'failed';
  }

  getChipLabel(): ScenarioResultLabel {
    if (this.status) {
      return this.chipLabel[this.status];
    }
    return 'Failed';
  }

  handleClick(event: Event) {
    this.clicked.emit(event);
  }
}
