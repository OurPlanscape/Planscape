import {
  Component,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@styleguide/button/button.component';

/**
 * Simple popover that opens when you click on the icon
 * Guidance popover, FAQ popover: https://www.figma.com/design/5hdeZ9G9zC6aDMOmW29wEh/Planscape-Design-System?node-id=4184-13630&m=dev
 */
@Component({
  selector: 'sg-popover',
  standalone: true,
  exportAs: 'sgPopover',
  imports: [CommonModule, MatMenuModule, MatIconModule, ButtonComponent],
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.scss'],
})
export class PopoverComponent {
  @Input() icon: string = 'info_outline';
  // We have black and default (blue) color variants on our figma
  @Input() iconColor: 'default' | 'black' = 'default';
  // We can pass either the content string or use the <ng-content>
  @Input() content: string | null = null;

  /**
   * Content as a template (takes precedence over `content`/projection). Rendered
   * with a `{ close }` context so a shared template can dismiss the popover:
   * `<ng-template #tpl let-close="close">…<button (click)="close()">…</ng-template>`.
   */
  @Input() contentTemplate: TemplateRef<unknown> | null = null;

  @Input() panelSize: 'small' | 'medium' = 'small';

  /**
   * When true, the popover behaves like an in-place modal: it stays open while
   * you interact with its projected content, sits flush (no tooltip padding),
   * and closes only via `close()` — typically wired to a projected sg-modal's
   * actions. Grab a reference with `#ref="sgPopover"` and call `ref.close()`.
   */
  @Input() modal = false;

  /** Emitted when the icon is clicked (e.g. to populate content before it opens). */
  @Output() opened = new EventEmitter<void>();

  @ViewChild(MatMenuTrigger) private trigger?: MatMenuTrigger;

  /** Dismiss the panel. Arrow fn so it can be passed around already bound. */
  close = () => {
    this.trigger?.closeMenu();
  };
}
