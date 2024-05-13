import { Component, ContentChild, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatInput, MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

// TODO add required

@Component({
  selector: 'sg-input',
  standalone: true,
  imports: [MatIconModule, CommonModule, MatInputModule, MatFormFieldModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
})
export class InputComponent {
  @ContentChild(MatInput, { static: false }) matInput?: MatInput;

  /**
   * the value of the input field
   */
  @Input() value = '';

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
   * The placeholder displayed on the input field
   */
  @Input() placeholder = '';

  /**
   * Text to be shown on the right side of the input field.
   */
  @Input() suffix = '';

  /**
   * optional form control name to be used with reactive forms
   */
  @Input() formControlName? = '';
}
