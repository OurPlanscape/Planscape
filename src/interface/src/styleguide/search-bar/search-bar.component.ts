import {
  Component,
  Output,
  EventEmitter,
  Input,
  OnInit,
  OnDestroy,
} from '@angular/core';
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
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

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
  ],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
})
export class SearchBarComponent implements OnInit, OnDestroy {
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
   *
   */
  @Output() searchString = new EventEmitter<string>();
  searchInput = new Subject<string>();
  displayedHistory: string[] = [];

  ngOnInit() {
    this.displayedHistory = this.historyItems.slice();
    this.searchInput
      .pipe(debounceTime(200), distinctUntilChanged(), untilDestroyed(this))
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

  ngOnDestroy() {
    this.searchInput.complete();
  }
}
