import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatLegacyChipInputEvent as MatChipInputEvent } from '@angular/material/legacy-chips';
import { EMAIL_VALIDATION_REGEX } from '@shared';

@Component({
  selector: 'app-chip-input',
  templateUrl: './chip-input.component.html',
  styleUrls: ['./chip-input.component.scss'],
})
export class ChipInputComponent {
  @Input() emails: string[] = [];
  @Input() placeholder = '';

  @Output() addEmail = new EventEmitter<string>();
  @Output() removeEmail = new EventEmitter<string>();
  @Output() isInvalid = new EventEmitter<boolean>();

  addIfValid(event: MatChipInputEvent): void {
    this.isInvalid.emit(false);
    const value = (event.value || '').trim();
    if (!value) {
      return;
    }

    if (value.match(EMAIL_VALIDATION_REGEX)) {
      this.addEmail.emit(value);
    } else {
      this.isInvalid.emit(true);
      return;
    }

    // Clear the input value
    event.chipInput!.clear();
  }
}
