import { Component, Output, EventEmitter, Input } from '@angular/core';
import {
  DatePipe,
  CurrencyPipe,
  NgIf,
  NgSwitch,
  NgClass,
} from '@angular/common';
import { ButtonComponent } from '../button/button.component';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { InputFieldComponent } from '../input/input-field.component';

/**
 * Search Bar component to encapsulate search behavior
 */
@Component({
  selector: 'sg-search-bar',
  standalone: true,
  imports: [
    DatePipe,
    NgIf,
    CurrencyPipe,
    NgSwitch,
    NgClass,
    ButtonComponent,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatAutocompleteModule,
    InputFieldComponent,
  ],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
})
export class SearchBarComponent {
  @Input() historyItems: string[] = [];
  @Input() searchPlaceholder: string = 'Search';

  //TODO: min search length, debounce
  @Output() searchChanged = new EventEmitter();
}
