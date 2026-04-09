
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
import { LegacyMaterialModule } from '@app/material/legacy-material.module';
import { MatTooltipModule } from '@angular/material/tooltip';

export type ResultLabel = 'Done' | 'In Progress' | 'Running' | 'Failed' | 'Draft';
export type ValidStatus = "LOADING" | "PENDING" | "RUNNING" | "SUCCESS" | "FAILURE" | "PANIC" | "TIMED_OUT" | "DRAFT" | 'INPROGRESS';

/**
 * List Card for displaying scenario, project area, or treatment card data in a results list
 */
@Component({
  selector: 'sg-list-card',
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
    LegacyMaterialModule,
    MatTooltipModule,
  ],
templateUrl: './list-card.component.html',
  styleUrl: './list-card.component.scss'
})

export class ListCardComponent {

  @Input() resultStatus: ScenarioResultStatus | 'INPROGRESS' = 'SUCCESS';
  @Input() name = '';
  @Input() creator?: string = '';
  @Input() created_at? = '';
 
  @Input() recordType: 'PROJECT_AREA' | 'SCENARIO' | 'TREATMENT' = 'SCENARIO'
  @Input() origin?: 'USER' | 'SYSTEM' = 'SYSTEM';
  @Input() userCanDeleteRecord = false;
  @Input() userCanEditRecord = false;
  @Input() userCanRenameRecord = false;
  @Input() contextualMenuEnabled = true;
  @Input() disabled = false;


  @Input() leftEdgeColor : string | null = null; 

  @Output() openRecord = new EventEmitter();
  @Output() openPlanningProgress = new EventEmitter();
  @Output() deleteRecord = new EventEmitter();
  @Output() editRecord = new EventEmitter();
  @Output() copyRecord = new EventEmitter();
  @Output() clicked = new EventEmitter();

// Define which types actually get a chip
  readonly recordTypeChipConfig = {
    'SCENARIO': { label: 'Scenario', class: 'scenario' },
    'PROJECT_AREA': { label: 'Project areas', class: 'project-area' }
  };


  readonly chipsStatus: Record<
    ValidStatus,
    {
      status: StatusChipStatus;
      label: ResultLabel;
    }
  > = {
    INPROGRESS: {status: 'inProgress', label: 'In Progress'},
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

  get showRecordChip() {
    return this.recordType !== 'TREATMENT'; 
  }

  @HostBinding('class.disabled-content')
  get disabledContent() {
    return this.isRunning() || this.disabled;
  }

  @HostBinding('class.project-area')
  get isProjectArea() {
    return this.recordType === 'PROJECT_AREA';
  }

  @HostBinding('class.scenario')
  get isScenario() {
    return this.recordType === 'SCENARIO';
  }

  @HostBinding('class.treatment')
  get isTreatmentArea() {
    return this.recordType === 'TREATMENT';
  }



  getChipStatus(): StatusChipStatus {
    console.log('for this name:', this.name);
    if (this.resultStatus) {
      console.log('we have this status:', this.resultStatus);
      return this.chipsStatus[this.resultStatus].status;
    }
    return 'failed';
  }

  getChipLabel(): ResultLabel {
    if (this.resultStatus) {
      return this.chipsStatus[this.resultStatus].label;
    }
    return 'Failed';
  }

  handleMoreMenuClick(event: Event) {
    event.stopPropagation();
  }


  @HostBinding('class.show-left-border') get hasBorder() {
    return !!this.leftEdgeColor;
  }

  @HostBinding('style.show-left-border') get colorVar() {
    return this.leftEdgeColor;
  }

}

