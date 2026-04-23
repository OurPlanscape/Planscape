import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';

import { MatMenuModule } from '@angular/material/menu';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TreatmentStatus } from '@types';
import {
  StatusChipComponent,
  StatusChipStatus,
} from '@styleguide/status-chip/status-chip.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sg-treatment-plan-card',
  standalone: true,
  imports: [
    StatusChipComponent,
    MatMenuModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    RouterLink
  ],
  templateUrl: './treatment-plan-card.component.html',
  styleUrl: './treatment-plan-card.component.scss',
})
export class TreatmentPlanCardComponent {
  @Input() name = '';
  @Input() creator = '';
  @Input() createdAt = '';
  @Input() status: TreatmentStatus = 'PENDING';

  @Input() userCanDelete: boolean = false;
  @Input() userCanDuplicate: boolean = false;

  @Input() treatmentLink: string = '';

  @Output() view = new EventEmitter();
  @Output() duplicate = new EventEmitter();
  @Output() delete = new EventEmitter();

  readonly chipsStatus: Record<TreatmentStatus, StatusChipStatus> = {
    PENDING: 'inProgress',
    SUCCESS: 'success',
    QUEUED: 'running',
    RUNNING: 'running',
    FAILURE: 'failed',
  };

  readonly statusLabel: Record<TreatmentStatus, string> = {
    PENDING: 'In Progress',
    SUCCESS: 'Done',
    QUEUED: 'Running',
    RUNNING: 'Running',
    FAILURE: 'Failed',
  };

  @HostBinding('class.disabled')
  get isDisabled() {
    return (
      this.status === 'RUNNING' ||
      this.status === 'QUEUED' ||
      this.status === 'FAILURE'
    );
  }

  stopEventPropagation(event: Event) {
    event.stopPropagation();
    return false;
  }
}
