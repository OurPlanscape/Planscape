import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [MatProgressSpinnerModule, MatButtonModule, RouterModule],
  selector: 'app-scenario-pending',
  templateUrl: './scenario-pending.component.html',
  styleUrls: ['./scenario-pending.component.scss'],
})
export class ScenarioPendingComponent {
  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);

  planId = this.route.snapshot.data['planId'];

  goBackToPlan() {
    this.router.navigate(['/plan', this.planId]);
  }
}
