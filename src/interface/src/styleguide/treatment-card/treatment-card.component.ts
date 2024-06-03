import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import { StatusChipComponent, StatusChipStatus } from '@styleguide';
import { MatMenuModule } from '@angular/material/menu';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type TreatmentCardStatus = 'In Progress' | 'Done' | 'Running' | 'Failed';

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
  @Input() status: TreatmentCardStatus = 'In Progress';

  @Output() view = new EventEmitter();
  @Output() duplicate = new EventEmitter();
  @Output() delete = new EventEmitter();

  readonly chipsStatus: Record<TreatmentCardStatus, StatusChipStatus> = {
    'In Progress': 'inProgress',
    Done: 'success',
    Running: 'running',
    Failed: 'failed',
  };

  @HostBinding('class.disabled')
  get isDisabled() {
    return this.status === 'Running';
  }
}
