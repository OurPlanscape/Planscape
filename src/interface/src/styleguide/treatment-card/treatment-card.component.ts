import {
  Component,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { StatusChipComponent, StatusChipStatus } from '@styleguide';
import { MatMenuModule } from '@angular/material/menu';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TreatmentStatus } from '@types';

@Component({
  selector: 'sg-treatment-card',
  standalone: true,
  imports: [
    StatusChipComponent,
    MatMenuModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './treatment-card.component.html',
  styleUrl: './treatment-card.component.scss',
})
export class TreatmentCardComponent {
  @Input() name = '';
  @Input() creator = '';
  @Input() createdAt = '';
  @Input() status: TreatmentStatus = 'PENDING';

  @Input() userCanDelete: boolean = false;
  @Input() userCanDuplicate: boolean = false;

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

  @HostListener('click')
  viewTreatment() {
    if (!this.isDisabled) {
      this.view.emit();
    }
  }

  stopEventPropagation(event: Event) {
    event.stopPropagation();
    return false;
  }
}
