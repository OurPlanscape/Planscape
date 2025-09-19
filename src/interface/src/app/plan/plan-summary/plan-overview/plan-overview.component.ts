import { Component, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { Plan } from '@types';

@Component({
  selector: 'app-plan-overview',
  templateUrl: './plan-overview.component.html',
  styleUrls: ['./plan-overview.component.scss'],
})
export class PlanOverviewComponent {
  @Input() plan$!: Observable<Plan | null>;
}
