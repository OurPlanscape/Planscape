import {
  Component,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
} from '@angular/core';
import { NgClass, NgIf, NgTemplateOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { PopoverComponent } from '@styleguide/popover/popover.component';
import { ButtonComponent } from '@styleguide/button/button.component';

/**
 * SectionComponent displays a panel with a title and optional tooltip.
 * Content passed into `<app-section></app-section>` is rendered inside,
 * and setting `collapsible` to true makes the panel expandable/collapsible.
 */
@Component({
  selector: 'sg-section',
  standalone: true,
  imports: [
    NgIf,
    NgTemplateOutlet,
    MatButtonModule,
    MatExpansionModule,
    PopoverComponent,
    NgClass,
    ButtonComponent,
  ],
  templateUrl: './section.component.html',
  styleUrl: './section.component.scss',
})
export class SectionComponent {
  @Input() headline = '';
  @Input() headlineHint = '';
  @Input() tooltipContent = '';
  // When both tooltipContent and tooltipTemplate are provided, tooltipTemplate takes precedence.
  @Input() tooltipTemplate: TemplateRef<any> | null = null;
  @Input() tooltipLink = '';
  @Input() required = false;

  @Input() isCollapsible = false;
  @Input() defaultExpanded = true;

  @Input() tooltipIcon: 'help' | 'info' = 'info';
  @Input() tooltipSize: 'small' | 'medium' = 'small';

  /**
   * When true, the tooltip opens as an interactive, modal-like panel anchored
   * to the icon, instead of the read-only `sg-popover`. It's backed by the same
   * `mat-menu` (so it animates and is elevated), but clicks inside it don't
   * close it — it only closes when the projected content calls the `close`
   * function exposed on the template context
   * (e.g. `<ng-template #tpl let-close="close">`). Requires `tooltipTemplate`.
   */
  @Input() tooltipInteractive = false;

  /**
   * Emitted when the tooltip icon is clicked in interactive mode. Useful for
   * populating/lazy-loading the tooltip content right before the panel opens,
   * so a shared template can be reused across sections.
   */
  @Output() tooltipClicked = new EventEmitter<void>();

  navigateToLink() {
    if (this.tooltipLink) {
      window.open(this.tooltipLink, '_blank');
    }
  }
}
