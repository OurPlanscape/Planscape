import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { PlanningAreaMenuComponent } from '@app/standalone/planning-area-menu/planning-area-menu.component';
import { PreviewPlan } from '@app/types';

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
  ],
  templateUrl: './planning-area-card.component.html',
  styleUrl: './planning-area-card.component.scss',
})
export class PlanningAreaCardComponent {
  @Input({ required: true }) planningArea!: PreviewPlan;
  @Output() afterDelete = new EventEmitter();
  @Output() afterRename = new EventEmitter();
}
