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

export type TreatmentCardStatus = 'FAILURE' | 'PENDING' | 'RUNNING' | 'SUCCESS';

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
  @Input() status: TreatmentCardStatus = 'PENDING';

  @Output() view = new EventEmitter();
  @Output() duplicate = new EventEmitter();
  @Output() delete = new EventEmitter();

  // TODO update with status
  readonly chipsStatus: Record<TreatmentCardStatus, StatusChipStatus> = {
    PENDING: 'inProgress',
    SUCCESS: 'success',
    RUNNING: 'running',
    FAILURE: 'failed',
  };

  @HostBinding('class.disabled')
  get isDisabled() {
    return this.status === 'RUNNING';
  }

  @HostListener('click')
  viewTreatment() {
    this.view.emit();
  }

  stopEventPropagation(event: Event) {
    event.stopPropagation();
    return false;
  }
}
