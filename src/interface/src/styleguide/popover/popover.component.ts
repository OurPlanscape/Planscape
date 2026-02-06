import { Component, Input } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
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
}
