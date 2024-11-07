import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputFieldComponent, ButtonComponent } from '@styleguide';
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

export type DebounceEditState = 'INITIAL' | 'EDIT' | 'SAVING';

/**
 * Component for setting name
 */
@UntilDestroy()
@Component({
  selector: 'sg-debounce-input',
  standalone: true,
  imports: [
    ButtonComponent,
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
  @Input() currentMode$ = new BehaviorSubject<DebounceEditState>('INITIAL');

  @Output() textValueUpdated = new EventEmitter<string>();
  @Input() debounceInterval = 10;
  readonly textValueUpdatedSubject = new Subject<string>();
  originalText = this.textValue;
  hovering = false;
  ngOnInit() {
    const debounceInterval = Number(this.debounceInterval);
    if (this.textValue === '') {
      this.currentMode$.next('EDIT');
    }
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

  handleEnterPress(e: Event) {
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
    //if the text is empty, we revert to the original text
    if (this.textValue === '' || this.textValue === this.originalText) {
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
  handleMouseDown(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }
  //This removes any edit changes and returns to initial state
  handleMouseUp(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.textValue = this.originalText;
    this.currentMode$.next('INITIAL');
  }
}
