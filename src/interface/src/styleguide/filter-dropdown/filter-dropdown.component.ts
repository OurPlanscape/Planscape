import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { InputFieldComponent } from '@styleguide';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'sg-filter-dropdown',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatMenuModule,
    MatCheckboxModule,
    InputFieldComponent,
    MatButtonModule,
    FormsModule,
  ],
  templateUrl: './filter-dropdown.component.html',
  styleUrls: ['./filter-dropdown.component.scss'],
})
export class FilterDropdownComponent implements OnInit {
  @Input() leadingIcon = '';
  @Input() hasSearch = true;
  @Input() disabled = false;
  @Input() menuLabel!: string;
  @Input() menuItems!: string[];
  @Input() activeFilter = false;
  @Output() updateSelection = new EventEmitter();
  displayedItems: string[] = [];
  selectedItems: string[] = [];
  searchTerm = '';
  private previousSelections: string[] = [];

  ngOnInit(): void {
    this.displayedItems = this.menuItems;
  }

  hasSelections(): boolean {
    return this.selectedItems.length > 0;
  }

  showCount(): boolean {
    return this.selectedItems.length > 1;
  }

  isInSelection(term: string): boolean {
    return this.selectedItems.includes(term);
  }

  toggleSelection(e: any, item: string) {
    if (!this.selectedItems.includes(item)) {
      this.selectedItems.push(item);
    } else {
      this.selectedItems = this.selectedItems.filter((e) => e !== item);
    }
    e.stopPropagation();
    this.updateSelection.emit(this.selectedItems);
  }

  selectionText(): string {
    if (this.selectedItems.length > 0) {
      return `${this.menuLabel}: ${this.selectedItems[0]}`;
    }
    return this.menuLabel;
  }

  handleCancel(e: any) {
    this.selectedItems = this.previousSelections.slice();
    this.previousSelections = [];
  }

  handleFilterClick() {
    //clear the search bar
    this.searchTerm = '';
    this.filterSearch();
    //capture the selections prior to this opening
    this.previousSelections = this.selectedItems.slice();
  }

  clearSelections(e: any): void {
    this.selectedItems = [];
    e.stopPropagation();
  }

  filterSearch(): void {
    if (this.searchTerm !== '') {
      this.displayedItems = this.menuItems.slice();
    }
    this.displayedItems = this.menuItems.filter((e) =>
      e.includes(this.searchTerm)
    );
  }
}
