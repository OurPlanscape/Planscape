import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

/**
 * Centered placeholder for a section or page that has no content yet.
 * Optional action content (usually a button) is projected below the text.
 */
@Component({
  selector: 'sg-empty-state',
  standalone: true,
  imports: [NgIf, MatIconModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  /**
   * The material icon shown above the title.
   * If blank the empty state will not have an icon.
   */
  @Input() icon = '';

  /**
   * If the icon uses the outline version
   */
  @Input() outlined = false;

  @Input() title = '';

  @Input() description = '';
}
