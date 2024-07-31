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
import { ButtonComponent, InputFieldComponent } from '@styleguide';
import { FormsModule } from '@angular/forms';
import { SearchBarComponent } from '../search-bar/search-bar.component';

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
   * The label text displayed for the menu
   */
  @Input() menuLabel!: string;
  /**
   * Items displayed in the menu, an object of any type
   */
  @Input() menuItems!: T[];

  /**
   * The display field for the menu items. Optional, used if the
   * provided menuItems is not already a string.
   */
  @Input() displayField?: keyof T;
  /**
   * Dynamically set the width from the consumer
   */
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  /**
   * Event that emits when list of selected items changes
   */
  @Output() changedSelection = new EventEmitter<T[]>();

  /**
   *  Event that emits when the `apply` button is clicked
   */
  @Output() confirmedSelection = new EventEmitter<T[]>();

  displayedItems: T[] = [];
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
      const itemsString = this.selectedItems
        .map((s) => {
          if (this.displayField && typeof s !== 'string') {
            return s[this.displayField] as string;
          }
          return s;
        })
        .join(', ');
      return `: ${itemsString}`;
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
    if (searchTerm !== '') {
      this.displayedItems = this.menuItems.slice();
    }

    this.displayedItems = this.menuItems.filter((item) => {
      let value = '';
      if (typeof item === 'string') {
        value = item;
      }
      if (this.displayField && typeof item !== 'string') {
        value = item[this.displayField] as string;
      }

      return value.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }

  applyChanges(e: Event) {
    this.confirmedSelection.emit(this.selectedItems);
  }

  @HostBinding('class.small')
  get isSmall() {
    return this.size === 'small';
  }
  @HostBinding('class.large')
  get isLarge() {
    return this.size === 'large';
  }
}
