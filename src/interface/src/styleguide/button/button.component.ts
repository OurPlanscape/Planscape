import { Component, HostBinding, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type ButtonVariant =
  | 'primary'
  | 'ghost'
  | 'text'
  | 'negative'
  | 'positive'
  | 'icon-only'
  | 'link';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[sg-button], a[sg-button]',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
})
export class ButtonComponent {
  /**
   * The variant used for the button.
   *
   */
  @Input() variant: ButtonVariant = 'ghost';
  /**
   * The optional icon used in the button.
   * If blank the button will not have an icon
   */
  @Input() icon: string = '';

  /**
   * If the icon uses the outline version
   */
  @Input() outlined = false;

  @Input() hasError = false;

  @Input() loading = false;

  @HostBinding('class.ghost-button')
  get isVariantGhost() {
    return this.variant === 'ghost';
  }

  @HostBinding('class.primary-button')
  get isVariantPrimary() {
    return this.variant === 'primary';
  }

  @HostBinding('class.negative-button')
  get isVariantNegative() {
    return this.variant === 'negative';
  }

  @HostBinding('class.text-button')
  get isVariantText() {
    return this.variant === 'text';
  }

  @HostBinding('class.positive-button')
  get isVariantPositive() {
    return this.variant === 'positive';
  }

  @HostBinding('class.icon-button')
  get isVariantIconOnly() {
    return this.variant === 'icon-only';
  }

  @HostBinding('class.link-button')
  get isVariantLinkOnly() {
    return this.variant === 'link';
  }

  @HostBinding('class.has-error')
  get itHasError() {
    return this.hasError;
  }
}
