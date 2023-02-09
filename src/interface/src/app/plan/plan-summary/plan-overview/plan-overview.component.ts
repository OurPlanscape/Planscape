import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Plan } from 'src/app/types';

@Component({
  selector: 'app-plan-overview',
  templateUrl: './plan-overview.component.html',
  styleUrls: ['./plan-overview.component.scss'],
})
export class PlanOverviewComponent {
  @Input() plan$ = new BehaviorSubject<Plan | null>(null);
  @Output() openConfigEvent = new EventEmitter<number>();
}
