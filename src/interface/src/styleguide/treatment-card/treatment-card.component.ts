import { Component, HostBinding, Input } from '@angular/core';
import { StatusChipComponent, StatusChipStatus } from '@styleguide';
import { MatMenuModule } from '@angular/material/menu';
import { DatePipe } from '@angular/common';

export type TreatmentCardStatus = 'Done' | 'Running' | 'Failed';

@Component({
  selector: 'sg-treatment-card',
  standalone: true,
  imports: [StatusChipComponent, MatMenuModule, DatePipe],
  templateUrl: './treatment-card.component.html',
  styleUrl: './treatment-card.component.scss',
})
export class TreatmentCardComponent {
  @Input() name = '';
  @Input() creator = '';
  @Input() createdAt = '';
  @Input() status: TreatmentCardStatus = 'Done';

  readonly chipsStatus: Record<TreatmentCardStatus, StatusChipStatus> = {
    Done: 'success',
    Running: 'running',
    Failed: 'failed',
  };

  @HostBinding('class.disabled')
  get isWarning() {
    return this.status === 'Failed' || this.status === 'Running';
  }
}
