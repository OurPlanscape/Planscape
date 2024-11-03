// handle errors
// emit change event

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { InputFieldComponent } from '@styleguide';
import {
  debounceTime,
  distinctUntilChanged,
  Subject,
  BehaviorSubject,
} from 'rxjs';
import { InputDirective } from '../input/input.directive';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

export type editState = 'INITIAL' | 'EDIT' | 'SAVING';

/**
 * Component for setting name
 */
@UntilDestroy()
@Component({
  selector: 'sg-debounce-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputFieldComponent,
    InputDirective,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    NgIf,
  ],
  templateUrl: './debounce-input.component.html',
  styleUrl: './debounce-input.component.scss',
})
export class DebounceInputComponent implements OnInit, OnDestroy {
  @Input() textValue = '';
  @Input() title = '';
  @Input() placeholderText: string | null = '';
  @Input() errorMessage: string | null = null;
  @Input() tooltipContent: string | null = null;
  @Input() hasClearButton = true;
  @Input() currentMode$ = new BehaviorSubject<editState>('INITIAL');

  @Output() textValueUpdated = new EventEmitter<string>();
  @Input() debounceInterval = 10;
  readonly textValueUpdatedSubject = new Subject<string>();
  originalText = this.textValue;
  hovering = false;

  // TODO: this component also needs a clear icon in EDIT mode

  ngOnInit() {
    const debounceInterval = Number(this.debounceInterval);
    this.originalText = this.textValue;
    this.textValueUpdatedSubject
      .pipe(
        debounceTime(debounceInterval),
        distinctUntilChanged(),
        untilDestroyed(this)
      )
      .subscribe((textValue: string) => {
        this.hovering = false;
        if (this.textValue !== '') {
          this.textValueUpdated.emit(this.textValue);
        }
      });
  }

  textValueUpdated$ = this.textValueUpdatedSubject
    .asObservable()
    .pipe(debounceTime(this.debounceInterval));

  clearError() {
    this.errorMessage = null;
  }

  emitTextValue(e: Event) {
    this.textValueUpdatedSubject.next(this.textValue);
    e.stopPropagation();
  }

  onHover() {
    this.hovering = true;
  }

  outHover() {
    this.hovering = false;
  }

  onBlur() {
    //if the text is clear, we just revert to the original text
    console.log('is text clear? whats original:', this.originalText);
    if (this.textValue === '') {
      this.textValue = this.originalText;
      this.currentMode$.next('INITIAL');
    } else if (this.textValue !== this.originalText) {
      this.textValueUpdated.emit(this.textValue);
    }
  }

  ngOnDestroy() {
    this.textValueUpdatedSubject.complete();
  }

  setToEditMode() {
    this.currentMode$.next('EDIT');
  }

  clear() {
    this.textValue = '';
  }
}
