import { Component, EventEmitter, Output } from '@angular/core';
import { SearchBarComponent } from '../../../styleguide/search-bar/search-bar.component';

@Component({
  selector: 'app-planning-areas-search',
  standalone: true,
  imports: [SearchBarComponent],
  templateUrl: './planning-areas-search.component.html',
  styleUrl: './planning-areas-search.component.scss',
})
export class PlanningAreasSearchComponent {
  readonly key = 'planningAreasSearchHistory';
  readonly maxLength = 20;

  historyItems: string[] = this.getItems();

  @Output() search = new EventEmitter<string>();

  private getItems(): string[] {
    const items = sessionStorage.getItem(this.key);
    if (items) {
      return JSON.parse(items);
    } else {
      return [];
    }
  }

  searchString(searchString: string) {
    // save to history
    if (searchString && !this.historyItems.includes(searchString)) {
      this.historyItems.unshift(searchString);
      this.historyItems = this.historyItems.slice(0, this.maxLength);
      sessionStorage.setItem(this.key, JSON.stringify(this.historyItems));
    }
    this.search.emit(searchString);
  }
}
