import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { PlanningAreaMenuComponent } from '@app/standalone/planning-area-menu/planning-area-menu.component';
import { PreviewPlan } from '@app/types';
import { SelectableLinkDirective } from '@styleguide/selectable-link/selectable-link.directive';

@Component({
  selector: 'sg-planning-area-card',
  standalone: true,
  imports: [
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    DatePipe,
    DecimalPipe,
    PlanningAreaMenuComponent,
    RouterLink,
    SelectableLinkDirective,
  ],
  templateUrl: './planning-area-card.component.html',
  styleUrl: './planning-area-card.component.scss',
})
export class PlanningAreaCardComponent {
  @Input({ required: true }) planningArea!: PreviewPlan;

  /** Where the card navigates. The whole card is the link. */
  @Input() link: string | any[] = [];

  @Output() afterDelete = new EventEmitter();
  @Output() afterRename = new EventEmitter();

  /** The menu sits inside the card's link, so its clicks must not navigate. */
  handleMenuClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();
  }
}
