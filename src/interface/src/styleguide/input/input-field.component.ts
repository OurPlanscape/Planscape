import {
  AfterContentInit,
  Component,
  ContentChild,
  HostBinding,
  Input,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { InputDirective } from './input.directive';

export type ShowSupportMessage = 'always' | 'on-error' | false;

/**
 * Wrapper component for input fields.
 * Expects an input[sgInput] element via content projection
 *
 * Usage:
 * <sg-input-field>
 *   <input sgInput ...>
 * </sg-input-field>
 */
@Component({
  selector: 'sg-input-field',
  standalone: true,
  imports: [MatIconModule, CommonModule, InputDirective],
  templateUrl: './input-field.component.html',
  styleUrl: './input-field.component.scss',
})
export class InputFieldComponent implements AfterContentInit {
  /**
   * Reference to the projected sgInput input element
   */
  @ContentChild(InputDirective, { static: false })
  inputDirective?: InputDirective;

  /**
   * The help/error message to be displayed below the input field.
   */
  @Input() supportMessage = '';

  /**
   * Icon displayed on the left side of the input field.
   * Uses `mat-icon` library internally
   * If not provided the icon is hidden.
   */
  @Input() leadingIcon = '';

  /**
   * Icon displayed on the right side of the input field.
   * Uses `mat-icon` library internally
   * If not provided the icon is hidden.
   */
  @Input() trailingIcon = '';

  /**
   * Determines if the input field is disabled. Affects the styles of the whole component.
   */
  @Input() disabled = false;

  /**
   * Determines if the input field has errors. Affects the styles of the whole component.
   */
  @Input() error = false;

  /**
   * Determines if the input field is highlighted. Affects the styles of the whole component.
   */
  @Input() highlighted = false;

  /**
   * Text to be shown on the right side of the input field.
   */
  @Input() suffix = '';

  /**
   * when to show support message
   */
  @Input() showSupportMessage: ShowSupportMessage = 'always';

  @HostBinding('class.error')
  get hasError() {
    return this.error;
  }

  @HostBinding('class.disabled')
  get isDisabled() {
    return this.disabled;
  }

  @HostBinding('class.highlighted')
  get isHighlighted() {
    return this.highlighted;
  }

  /**
   * @ignore
   * This checks that when using this component we have an input with sgInput via ngContent
   */
  ngAfterContentInit() {
    if (!this.inputDirective) {
      throw new Error(
        'The projected content must include an <input> element with the sgInput directive.'
      );
    }
  }

  get displaysSupportMessage() {
    return (
      this.showSupportMessage === 'always' ||
      (this.showSupportMessage === 'on-error' && this.error)
    );
  }

  /**
   * @ignore
   */
  focusInput(): void {
    this.inputDirective?.focus();
  }
}
