// handle errors
// emit change event

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { InputFieldComponent } from '@styleguide';
// import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { InputDirective } from '../input/input.directive';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
/**
 * Component for setting name
 */
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
export class SidebarNameInputComponent {
  @Input() textValue = '';
  @Input() title = '';
  @Input() placeholderText: string | null = '';
  @Input() errorMessage: string | null = null;
  @Input() tooltipContent: string | null = null;
  @Input() saving = false;
  @Output() textValueUpdated = new EventEmitter<string>();

  clearError() {
    this.errorMessage = null;
  }

  emitTextValue(e: Event) {
    this.textValueUpdated.emit(this.textValue);
  }
}
