import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ButtonComponent } from '@styleguide';
import { MatExpansionModule } from '@angular/material/expansion';

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
  ],
  templateUrl: './section.component.html',
  styleUrl: './section.component.scss',
})
export class SectionComponent {
  @Input() headline = '';
  @Input() tooltipContent = '';

  @Input() isCollapsible = false;

  stopPropagation(e: Event) {
    e.stopPropagation();
  }
}
