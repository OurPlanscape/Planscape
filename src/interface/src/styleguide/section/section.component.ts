import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { ButtonComponent } from '../button/button.component';
import { PopoverComponent } from '../popover/popover.component';

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
    MatMenuModule,
    MatButtonModule,
    ButtonComponent,
    MatExpansionModule,
    PopoverComponent,
  ],
  templateUrl: './section.component.html',
  styleUrl: './section.component.scss',
})
export class SectionComponent {
  @Input() headline = '';
  @Input() tooltipContent = '';
  @Input() required = false;

  @Input() isCollapsible = false;
  @Input() defaultExpanded = true;

  @Input() tooltipIcon: 'help' | 'info' = 'info';

  stopPropagation(e: Event) {
    e.stopPropagation();
  }
}
