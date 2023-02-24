import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { PlanService } from 'src/app/services';
import { Plan, Scenario } from 'src/app/types';

@Component({
  selector: 'app-saved-scenarios',
  templateUrl: './saved-scenarios.component.html',
  styleUrls: ['./saved-scenarios.component.scss'],
})
export class SavedScenariosComponent implements OnInit {
  @Input() plan: Plan | null = null;
  @Output() createScenarioEvent = new EventEmitter<void>();

  scenarios: Scenario[] = [];
  displayedColumns: string[] = ['id', 'createdTimestamp'];

  constructor(
    private planService: PlanService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.planService
      .getScenariosForPlan(this.plan?.id!)
      .pipe(take(1))
      .subscribe((scenarios) => {
        this.scenarios = scenarios;
      });
  }

  createScenario(): void {
    this.createScenarioEvent.emit();
  }

  viewScenario(id: string): void {
    this.router.navigate(['scenario', id], { relativeTo: this.route });
  }
}
