import { Component, Input, TemplateRef } from '@angular/core';
import { NgClass, NgIf, NgTemplateOutlet } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
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
    MatMenuModule,
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

  stopPropagation(e: Event) {
    e.stopPropagation();
  }

  navigateToLink() {
    if (this.tooltipLink) {
      window.open(this.tooltipLink, '_blank');
    }
  }
}
