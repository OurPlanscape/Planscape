import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import {
  CurrencyPipe,
  DatePipe,
  NgClass,
  NgIf,
  NgSwitch,
} from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ScenarioResultStatus } from '@types';
import {
  StatusChipComponent,
  StatusChipStatus,
} from '@styleguide/status-chip/status-chip.component';
import { ButtonComponent } from '@styleguide/button/button.component';

export type ScenarioResultLabel = 'Done' | 'Running' | 'Failed' | 'Draft';

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
  @Input() resultStatus: ScenarioResultStatus = 'SUCCESS';
  @Input() archiveStatus: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE';
  @Input() name = '';
  @Input() areas? = 0;
  @Input() budget: number | null = null;
  @Input() treatmentPlansCount?: number = 0;
  @Input() creator?: string = '';
  @Input() created_at? = '';
  @Input() selected: boolean = false;
  @Input() origin?: 'USER' | 'SYSTEM' = 'SYSTEM';
  @Input() userCanArchiveScenario = false;
  @Input() userCanDeleteScenario = false;
  @Input() userCanEditScenario = false;
  @Input() showTreatmentPlanButton = false;
  @Input() contextualMenuEnabled = true;
  @Input() disabled = false;

  @Output() openScenario = new EventEmitter();
  @Output() openPlanningProgress = new EventEmitter();
  @Output() openNewTreatment = new EventEmitter();
  @Output() toggleArchiveStatus = new EventEmitter();
  @Output() deleteScenario = new EventEmitter();
  @Output() editScenario = new EventEmitter();
  @Output() clicked = new EventEmitter();

  readonly chipsStatus: Record<
    ScenarioResultStatus,
    {
      status: StatusChipStatus;
      label: ScenarioResultLabel;
    }
  > = {
    FAILURE: { status: 'failed', label: 'Failed' },
    LOADING: { status: 'running', label: 'Running' },
    PANIC: { status: 'failed', label: 'Failed' },
    PENDING: { status: 'running', label: 'Running' },
    RUNNING: { status: 'running', label: 'Running' },
    SUCCESS: { status: 'success', label: 'Done' },
    TIMED_OUT: { status: 'failed', label: 'Failed' },
    DRAFT: { status: 'draft', label: 'Draft' },
  };

  hasFailed(): boolean {
    const failedValues = ['FAILURE', 'PANIC', 'TIMED_OUT'];
    return failedValues.includes(this.resultStatus);
  }

  isRunning(): boolean {
    const runningValues = ['LOADING', 'PENDING', 'RUNNING'];
    return runningValues.includes(this.resultStatus);
  }

  isDone(): boolean {
    const doneValues = ['SUCCESS'];
    return doneValues.includes(this.resultStatus);
  }

  isArchived(): boolean {
    return this.archiveStatus === 'ARCHIVED';
  }

  @HostBinding('class.disabled-content')
  get disabledContent() {
    return this.isRunning() || this.disabled;
  }

  @HostBinding('class.selected')
  get isSelected() {
    return this.selected;
  }

  getChipStatus(): StatusChipStatus {
    if (this.resultStatus) {
      return this.chipsStatus[this.resultStatus].status;
    }
    return 'failed';
  }

  getChipLabel(): ScenarioResultLabel {
    if (this.resultStatus) {
      return this.chipsStatus[this.resultStatus].label;
    }
    return 'Failed';
  }

  handleMoreMenuClick(event: Event) {
    event.stopPropagation();
  }
}
