import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-scenario-confirmation',
  templateUrl: './scenario-confirmation.component.html',
  styleUrls: ['./scenario-confirmation.component.scss'],
})
export class ScenarioConfirmationComponent {
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  navigateToAreaOverview(): void {
    const planId = this.route.snapshot.paramMap.get('id');
    this.router.navigate(['plan', planId]);
  }
}
