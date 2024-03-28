import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-section-loader',
  templateUrl: './section-loader.component.html',
  styleUrls: ['./section-loader.component.scss'],
})
export class SectionLoaderComponent {
  showOnlyMine = false;

  @Input() isLoading = false;
  @Input() hasData = false;
  @Input() emptyStateTitle = '';
  @Input() emptyStateContent = '';
  @Input() hasError? = false;
  @Input() errorMsg?: string;
  @Input() errorTitle?: string;
  @Output() onlyMyScenariosToggle = new EventEmitter<boolean>();

  handleShowOnlyMineToggle() {
    this.onlyMyScenariosToggle.emit(this.showOnlyMine);
  }
}
