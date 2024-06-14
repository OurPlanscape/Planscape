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
  historyItems: string[] = [];

  @Output() search = new EventEmitter<string>();

  searchString(searchString: string) {
    console.log('searching!', searchString);
    // save to history
    if (searchString && !this.historyItems.includes(searchString)) {
      this.historyItems.push(searchString);
    }
    this.search.emit(searchString);
  }
}
