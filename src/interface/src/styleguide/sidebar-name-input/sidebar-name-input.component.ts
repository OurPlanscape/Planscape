// handle errors
// emit change event

import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  //     DatePipe,
  //     CurrencyPipe,
  NgIf,
  //     NgSwitch,
  //     NgClass,
} from '@angular/common';
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
  imports: [NgIf, InputFieldComponent, InputDirective, MatIconModule],
  templateUrl: './sidebar-name-input.component.html',
  styleUrl: './sidebar-name-input.component.scss',
})
export class SidebarNameInputComponent {
  @Input() name = '';
  @Input() title = '';
  @Input() errorMessage: string | null = null;
  @Output() updatedName = new EventEmitter();
}
