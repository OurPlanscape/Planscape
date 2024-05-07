import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { Plan } from '@types';

@Component({
  selector: 'app-plan-overview',
  templateUrl: './plan-overview.component.html',
  styleUrls: ['./plan-overview.component.scss'],
})
export class PlanOverviewComponent {
  @Input() plan$ = new BehaviorSubject<Plan | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  openConfig(configId?: number): void {
    if (!configId) {
      this.router.navigate(['config', ''], {
        relativeTo: this.route,
      });
    } else {
      this.router.navigate(['config', configId], { relativeTo: this.route });
    }
  }
}
