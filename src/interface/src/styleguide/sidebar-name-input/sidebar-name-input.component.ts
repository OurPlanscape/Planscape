// handle errors
// emit change event

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { InputFieldComponent } from '@styleguide';
// import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { InputDirective } from '../input/input.directive';
import { MatIconModule } from '@angular/material/icon';

/**
 * Component for setting name
 */
@Component({
  selector: 'sg-sidebar-name-input',
  standalone: true,
  imports: [
    NgIf,
    FormsModule,
    InputFieldComponent,
    InputDirective,
    MatIconModule,
  ],
  templateUrl: './sidebar-name-input.component.html',
  styleUrl: './sidebar-name-input.component.scss',
})
export class SidebarNameInputComponent {
  @Input() textValue = '';
  @Input() title = '';
  @Input() helpText = '';
  @Input() errorMessage: string | null = null;
  @Output() textValueUpdated = new EventEmitter<string>();

  emitTextValue(e: Event) {
    this.textValueUpdated.emit(this.textValue);
  }
}
