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
   * Reference to the projected  sgInput input element
   */
  @ContentChild(InputDirective, { static: false })
  inputDirective?: InputDirective;

  /**
   * @ignore
   */
  ngAfterContentInit() {
    if (!this.inputDirective) {
      throw new Error(
        'The projected content must include an <input> element with the sgInput directive.'
      );
    }
  }

  focusInput(): void {
    this.inputDirective?.focus();
  }

  /**
   * The help/error message to be displayed below the input field.
   */
  @Input() supportMessage = '';

  /**
   * Icon displayed on the left side of the input field.
   * If not provided the icon is hidden.
   */
  @Input() leadingIcon = '';

  /**
   * Icon displayed on the right side of the input field.
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

  protected readonly focus = focus;
}
