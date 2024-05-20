import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';

export type BannerType = 'info' | 'warning' | 'error' | 'success';

@Component({
  selector: 'sg-banner',
  standalone: true,
  imports: [MatIconModule, NgIf],
  templateUrl: './banner.component.html',
  styleUrl: './banner.component.scss',
})
export class BannerComponent {
  /**
   * the type of banner
   */
  @Input() type: BannerType = 'info';

  /**
   * If the banner shows an icon to dismiss
   */
  @Input() dismissible = false;

  /**
   * the emitter of the dismiss action
   */
  @Output() dismiss = new EventEmitter();

  /**
   * @ignore
   */
  readonly icon: Record<BannerType, string> = {
    info: 'info_filled',
    warning: 'warning_filled',
    error: 'error_filled',
    success: 'error_filled',
  };

  @HostBinding('class.info')
  get isPrimary() {
    return this.type === 'info';
  }

  @HostBinding('class.warning')
  get isWarning() {
    return this.type === 'warning';
  }

  @HostBinding('class.error')
  get isError() {
    return this.type === 'error';
  }

  @HostBinding('class.success')
  get isSuccess() {
    return this.type === 'success';
  }
}
