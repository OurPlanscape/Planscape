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

    const tokens = this.tokenize(value);
    if (tokens.length === 0) {
      return;
    }

    const invalid = this.addTokens(tokens);

    if (invalid.length === tokens.length) {
      this.isInvalid.emit(true);
      return;
    }

    event.chipInput!.clear();
    if (invalid.length > 0) {
      this.isInvalid.emit(true);
    }
  }

  onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    if (!text.trim()) {
      return;
    }
    event.preventDefault();
    this.isInvalid.emit(false);

    const tokens = this.tokenize(text);
    if (tokens.length === 0) {
      return;
    }

    const invalid = this.addTokens(tokens);
    const input = event.target as HTMLInputElement;
    input.value = invalid.join(', ');

    if (invalid.length > 0) {
      this.isInvalid.emit(true);
    }
  }

  private tokenize(value: string): string[] {
    // Split by commas, semicolons, or newlines first so "Name <email>" segments stay intact.
    return value
      .split(/[,;\n]+/)
      .flatMap((segment) => {
        const match = segment.match(/<([^>]+)>/);
        if (match) {
          return [match[1].trim()];
        }
        // No angle brackets: split on whitespace to handle "a@x.com b@y.com".
        return segment.split(/\s+/).map((s) => s.trim());
      })
      .filter((token) => token.length > 0);
  }

  private addTokens(tokens: string[]): string[] {
    const invalid: string[] = [];
    for (const token of tokens) {
      if (token.match(EMAIL_VALIDATION_REGEX)) {
        this.addEmail.emit(token);
      } else {
        invalid.push(token);
      }
    }
    return invalid;
  }
}
