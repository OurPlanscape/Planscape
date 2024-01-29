import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-section-loader',
  templateUrl: './section-loader.component.html',
  styleUrls: ['./section-loader.component.scss'],
})
export class SectionLoaderComponent {
  @Input() isLoading = false;
  @Input() hasData = false;
  @Input() emptyStateTitle = '';
  @Input() emptyStateContent = '';
}
