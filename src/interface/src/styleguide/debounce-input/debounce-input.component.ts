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
  Observable,
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
  @Input() savingStatus$: Observable<boolean> = new BehaviorSubject<boolean>(
    false
  );
  @Output() textValueUpdated = new EventEmitter<string>();
  @Input() debounceInterval = 800;
  readonly textValueUpdatedSubject = new Subject<string>();

  currentMode: editState = 'INITIAL';

  //TODO: subscribe to savingstatus -- when it's done, we update currentMode

  ngOnInit() {
    const debounceInterval = Number(this.debounceInterval);
    this.textValueUpdatedSubject
      .pipe(
        debounceTime(debounceInterval),
        distinctUntilChanged(),
        untilDestroyed(this)
      )
      .subscribe((textValue: string) => {
        this.textValueUpdated.emit(this.textValue);
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
    console.log('hovering...');
  }

  ngOnDestroy() {
    this.textValueUpdatedSubject.complete();
  }

  toggleMode() {
    if (this.currentMode === 'EDIT') {
      this.currentMode = 'INITIAL';
    } else {
      this.currentMode = 'EDIT';
    }
  }

  inEditMode() {
    return this.currentMode === 'EDIT';
  }
}
