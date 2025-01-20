import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule, KeyValue, KeyValuePipe } from '@angular/common';
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
    KeyValuePipe,
  ],
  templateUrl: './filter-dropdown.component.html',
  styleUrls: ['./filter-dropdown.component.scss'],
})
export class FilterDropdownComponent<T> implements OnInit, OnChanges {
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

  displayedItems: any[] = [];

  displayCategories: boolean = false;

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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['menuItems']) {
      this.displayCategories = this.menuItems.some((e) => (e as any).category);
    }
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

  isInSelection(term: any): boolean {
    return this.selectedItems.includes(term);
  }

  toggleSelection(e: Event, item: any): void {
    const key = (item as KeyValue<string, string>).key || item;

    if (!this.selectedItems.includes(key as T)) {
      this.selectedItems.push(key as T);
    } else {
      this.selectedItems = this.selectedItems.filter(
        (selected) => selected !== key
      );
    }

    e.stopPropagation();
    this.changedSelection.emit(this.selectedItems);
  }

  get selectionText(): string {
    if (this.selectedItems.length > 0) {
      const displayedSelections = this.selectedItems.map((item) => {
        return this.displayField && typeof item !== 'string'
          ? item[this.displayField]
          : item;
      });
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

        if (this.displayCategories && (item as any).options) {
          const filteredOptions = (item as any).options.filter(
            (subItem: any) => {
              return subItem.toLowerCase().includes(searchTerm.toLowerCase());
            }
          );

          if (filteredOptions.length > 0) {
            matches = true;
            return { ...item, options: filteredOptions };
          }
        }

        if (value.toLowerCase().includes(searchTerm.toLowerCase())) {
          matches = true;
        }

        return matches ? item : null;
      })
      .filter((item) => item !== null);
  }

  getLabel(item: any): string {
    if (typeof item.value === 'string') {
      return item.value;
    } else {
      return item.value
        .map((x: any) => {
          return `${x.description} (year ${x.year})`;
        })
        .join(',\n');
    }
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
