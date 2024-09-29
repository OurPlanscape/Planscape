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
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { InputFieldComponent } from '@styleguide';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { InputDirective } from '../input/input.directive';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

/**
 * Component for setting name
 */
@UntilDestroy()
@Component({
  selector: 'sg-sidebar-name-input',
  standalone: true,
  imports: [
    FormsModule,
    InputFieldComponent,
    InputDirective,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    NgIf,
  ],
  templateUrl: './sidebar-name-input.component.html',
  styleUrl: './sidebar-name-input.component.scss',
})
export class SidebarNameInputComponent implements OnInit, OnDestroy {
  @Input() textValue = '';
  @Input() title = '';
  @Input() placeholderText: string | null = '';
  @Input() errorMessage: string | null = null;
  @Input() tooltipContent: string | null = null;
  @Input() saving = false;
  @Output() textValueUpdated = new EventEmitter<string>();
  @Input() debounceInterval = 800;
  private textValueUpdatedSubject = new Subject<string>();

  ngOnInit() {
    const debounceInterval = Number(this.debounceInterval);
    this.textValueUpdatedSubject
      .pipe(
        debounceTime(debounceInterval),
        distinctUntilChanged(),
        untilDestroyed(this)
      )
      .subscribe((textValue: string) => {
        this.saving = true;
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

  ngOnDestroy() {
    this.textValueUpdatedSubject.complete();
  }
}
