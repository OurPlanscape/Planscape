import { Component, EventEmitter, Input, Output } from '@angular/core';

import { EMAIL_VALIDATION_REGEX } from '@shared';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { NgForOf } from '@angular/common';

@Component({
  selector: 'app-chip-input',
  templateUrl: './chip-input.component.html',
  styleUrls: ['./chip-input.component.scss'],
  standalone: true,
  imports: [MatChipsModule, MatInputModule, MatIconModule, NgForOf],
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
