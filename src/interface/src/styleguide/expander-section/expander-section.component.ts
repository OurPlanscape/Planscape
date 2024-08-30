import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass, NgForOf, NgIf } from '@angular/common';

/**
 * The expander section component shows a title with a control to expand and collapse
 * inner content.
 * This component accepts html via content projection.
 * Its content can be any arbitrary html, or you can provide `<sg-expander-item>` to display
 * a list of radio buttons with optional tooltips.
 */
@Component({
  selector: 'sg-expander-section',
  standalone: true,
  imports: [NgForOf, NgIf, NgClass],
  templateUrl: './expander-section.component.html',
  styleUrl: './expander-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpanderSectionComponent {
  @Input() isOpen?: boolean;
  @Input() title: string = '';
}
