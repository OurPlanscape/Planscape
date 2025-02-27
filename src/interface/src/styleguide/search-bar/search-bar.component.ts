import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import {
  CurrencyPipe,
  DatePipe,
  NgClass,
  NgIf,
  NgSwitch,
} from '@angular/common';
import { ButtonComponent } from '../button/button.component';
import { InputFieldComponent } from '../input/input-field.component';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';

import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { InputDirective } from '../input/input.directive';

/**
 * Search Bar component to encapsulate search behavior. This includes an optional autocomplete list.
 */
@UntilDestroy()
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
    InputDirective,
  ],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
})
export class SearchBarComponent implements OnInit, OnDestroy {
  @ViewChild('inputElement') inputElement!: ElementRef<HTMLInputElement>;

  /**
   * The value of the string displayed in the searchbar input element.
   */
  @Input() searchValue: string = '';
  /**
   * The search history list for this component, which can be filtered locally.
   *  If this history is empty, we don't show a history panel.
   */
  @Input() historyItems: string[] = [];
  /**
   * The placeholder label for the input component.
   */
  @Input() searchPlaceholder: string = 'Search';
  /**
   * Determines whether or not the autocomplete history should be filtered by the search term.
   */
  @Input() filterHistory: boolean = true;
  /**
   * The label for the list of autocomplete items.
   */
  @Input() autocompleteTitle = 'Recent Searches';
  /**
   * Allow the parent component to set a debounce
   */
  @Input() debounceInterval: number = 200;
  /**
   * Specify the height of the input form component
   */
  @Input() inputHeight: 'small' | 'regular' = 'small';
  /**
   *
   */
  @Output() searchString = new EventEmitter<string>();
  searchInput = new Subject<string>();
  displayedHistory: string[] = [];

  ngOnInit() {
    const debounceInterval = Number(this.debounceInterval);
    this.displayedHistory = this.historyItems.slice();
    this.searchInput
      .pipe(
        debounceTime(debounceInterval),
        distinctUntilChanged(),
        untilDestroyed(this)
      )
      .subscribe((searchTerm: string) => {
        this.searchString.emit(searchTerm);
      });
  }

  onSearchInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const val = target.value;
    if (this.filterHistory) {
      this.displayedHistory = this.historyItems.filter((e) => e.includes(val));
    }
    this.searchInput.next(val);
  }

  onInputKey(event: Event) {
    event.stopPropagation();
  }

  onHistorySelection(event: MatAutocompleteSelectedEvent) {
    this.searchInput.next(event.option.value);
  }

  ngOnDestroy() {
    this.searchInput.complete();
  }
}
