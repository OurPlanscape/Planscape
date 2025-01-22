import { Component, HostBinding, Input } from '@angular/core';
import { NgIf, NgSwitch } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type StatusChipStatus = 'inProgress' | 'success' | 'failed' | 'running';

/**
 * Status chip to display status inline.
 * Takes optional label or displays the status styled accordingly.
 */
@Component({
  selector: 'sg-status-chip',
  standalone: true,
  imports: [NgIf, NgSwitch, MatIconModule],
  templateUrl: './status-chip.component.html',
  styleUrl: './status-chip.component.scss',
})
export class StatusChipComponent {
  /**
   * The status
   */
  @Input() status: StatusChipStatus = 'inProgress';
  /**
   * Optional label
   */
  @Input() label? = '';

  @Input() icon?: string;

  /**
   * @ignore
   */
  readonly defaultTextByStatus: Record<StatusChipStatus, string> = {
    inProgress: 'In Progress',
    success: 'Success',
    failed: 'Failed',
    running: 'Running',
  };

  @HostBinding('class.in-progress')
  get isInProgress() {
    return this.status === 'inProgress';
  }

  @HostBinding('class.success')
  get isSuccess() {
    return this.status === 'success';
  }

  @HostBinding('class.failed')
  get isFailed() {
    return this.status === 'failed';
  }

  @HostBinding('class.running')
  get isRunning() {
    return this.status === 'running';
  }
}
