import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MenuCloseReason } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { SearchBarComponent } from '@styleguide/search-bar/search-bar.component';
import { InputFieldComponent } from '@styleguide/input/input-field.component';
import { ButtonComponent } from '@styleguide/button/button.component';

/**
 * Filter dropdown that lets user select one or multiple strings as part of a search
 */
@Component({
  selector: 'sg-filter-dropdown',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatMenuModule,
    MatCheckboxModule,
    InputFieldComponent,
    SearchBarComponent,
    FormsModule,
    ButtonComponent,
  ],
  templateUrl: './filter-dropdown.component.html',
  styleUrls: ['./filter-dropdown.component.scss'],
})
export class FilterDropdownComponent<T> implements OnInit {
  @ViewChild(SearchBarComponent) searchbar!: SearchBarComponent;

  /**
   * Accepts the name of a Material Icon to be displayed at the left of the menu trigger
   */
  @Input() leadingIcon = '';
  /**
   * Determines whether a search bar is present for filtering menu options
   */
  @Input() hasSearch = true;
  @Input() disabled = false;
  /**
   * Whether to display the count chip in the label
   */
  @Input() showCountChip = true;
  /**
   * The label text displayed for the menu
   */
  @Input() menuLabel!: string;
  /**
   * The label text displayed for the menu, if nothing is selected
   */
  @Input() noSelectionsLabel?: string;
  /**
   * Items displayed in the menu, an object of any type
   */
  @Input() menuItems!: T[];

  /**
   * The display field for the menu items. Optional, used if the
   * provided menuItems is not a simple string.
   */
  @Input() displayField?: keyof T;
  /**
   * The object attribute value shown in the dropdown for selected menu items, if specified.
   * Optional, used if set, and if the provided menuItems is not a simple string.
   */
  @Input() shortLabel?: keyof T;
  /**
   * Dynamically set the width from the consumer
   */
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  /**
   * Don't style differently when selection items
   */
  @Input() unstyledSelections = false;

  /**
   * Event that emits when list of selected items changes
   */
  @Output() changedSelection = new EventEmitter<T[]>();

  /**
   *  Event that emits when the `apply` button is clicked
   */
  @Output() confirmedSelection = new EventEmitter<T[]>();

  displayedItems: any[] = [];

  /**
   * the items already selected
   */
  @Input() selectedItems: T[] = [];

  /**
   * The search term
   */
  @Input() searchTerm = '';

  private previousSelections: T[] = [];

  ngOnInit(): void {
    this.displayedItems = this.menuItems;
  }

  hasSelections(): boolean {
    return this.selectedItems.length > 0;
  }

  handleClosedMenu(e: MenuCloseReason): void {
    // if menu was closed because of the apply button,
    // we don't cancel the selections
    if (e !== 'click') {
      this.handleCancel();
    }
  }

  isInSelection(term: T): boolean {
    return this.selectedItems.includes(term);
  }

  toggleSelection(e: Event, item: T) {
    if (!this.selectedItems.includes(item)) {
      this.selectedItems.push(item);
    } else {
      this.selectedItems = this.selectedItems.filter((e) => e !== item);
    }
    e.stopPropagation();
    this.changedSelection.emit(this.selectedItems);
  }

  get selectionText(): string {
    if (this.selectedItems.length > 0) {
      const displayedSelections = this.selectedItems.map((item) => {
        // we select values following this precendence:

        //if there's a shortLabel attribute set, we choose that field
        if (this.shortLabel && typeof item !== 'string') {
          return item[this.shortLabel];
          // if there's a displayField attribute set, we fallback to that
        } else if (this.displayField && typeof item !== 'string') {
          return item[this.displayField];
        } else {
          // otherwise we just consider this a string and return the string
          return item;
        }
      });
      // and then we sort, if the shortLabel is selected
      if (this.shortLabel) {
        displayedSelections.sort();
      }

      return `: ${displayedSelections.join(', ')}`;
    }
    return '';
  }

  handleCancel() {
    this.selectedItems = this.previousSelections.slice();
    this.previousSelections = [];
  }

  openFilterPanel() {
    this.filterSearch(this.searchTerm);
    //copy the selections we had prior to opening, in case the user hits cancel
    this.previousSelections = this.selectedItems.slice();
  }

  clearSelections(e: Event): void {
    this.selectedItems = [];
    this.searchTerm = '';
    this.changedSelection.emit(this.selectedItems);
    e.stopPropagation();
  }

  clearAndConfirmSelections(e: Event): void {
    this.clearSelections(e);
    this.confirmedSelection.emit(this.selectedItems);
  }

  filterSearch(searchTerm: string): void {
    if (searchTerm === '') {
      this.displayedItems = this.menuItems.slice();
      return;
    }

    this.displayedItems = this.menuItems
      .map((item) => {
        let matches = false;
        let value = '';

        if (typeof item === 'string') {
          value = item;
        }

        if (this.displayField && typeof item !== 'string') {
          value = item[this.displayField] as string;
        }

        if (value.toLowerCase().includes(searchTerm.toLowerCase())) {
          matches = true;
        }

        return matches ? item : null;
      })
      .filter((item) => item !== null);
  }

  applyChanges(e: Event) {
    this.confirmedSelection.emit(this.selectedItems);
  }

  @HostBinding('class.small')
  get isSmall() {
    return this.size === 'small';
  }

  @HostBinding('class.medium')
  get isMedium() {
    return this.size === 'medium';
  }

  @HostBinding('class.large')
  get isLarge() {
    return this.size === 'large';
  }
}
