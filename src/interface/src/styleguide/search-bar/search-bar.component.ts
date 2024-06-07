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
export class SearchBarComponent implements OnInit, OnDestroy {
  @Input() historyItems: string[] = [];
  @Input() searchPlaceholder: string = 'Search';
  @Input() filterHistory: boolean = true;
  @Input() autocompleteTitle = 'Recent Searches';
  @Output() searchString = new EventEmitter<string>();
  searchInput = new Subject<string>();
  displayedHistory: string[] = [];

  ngOnInit() {
    this.displayedHistory = this.historyItems.slice();
    this.searchInput
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((searchTerm: string) => {

        this.searchString.emit(searchTerm);
      });
  }

  onSearchInputChange(e: any) {
    const val = e.target.value;
    if (this.filterHistory) {
      this.displayedHistory = this.historyItems.filter((e) =>
        e.includes(val)
      );
    }
    this.searchInput.next(val);
  }

  ngOnDestroy() {
    this.searchInput.complete();
  }
}
