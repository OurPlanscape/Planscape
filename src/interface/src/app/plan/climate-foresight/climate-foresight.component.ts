import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { PlanState } from '../plan.state';
import { SharedModule } from '../../shared/shared.module';
import { ScenarioMapComponent } from '../../maplibre-map/scenario-map/scenario-map.component';
import { Plan } from '@types';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-climate-foresight',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    SharedModule,
    ScenarioMapComponent,
  ],
  templateUrl: './climate-foresight.component.html',
  styleUrls: ['./climate-foresight.component.scss'],
})
export class ClimateForesightComponent implements OnInit {
  planName = '';
  planAcres = '';
  hasAnalyses = false;
  currentPlan: Plan | null = null;

  constructor(
    private router: Router,
    private planState: PlanState
  ) {}

  ngOnInit(): void {
    this.planState.currentPlan$.pipe(take(1)).subscribe((plan) => {
      if (plan) {
        this.currentPlan = plan;
        this.planName = plan.name;
        this.planAcres = plan.area_acres
          ? `Acres: ${plan.area_acres.toLocaleString()}`
          : '';
      }
    });
  }

  navigateBack(): void {
    if (this.currentPlan?.id) {
      this.router.navigate(['/plan', this.currentPlan.id]);
    } else {
      this.router.navigate(['/']);
    }
  }

  startAnalysis(): void {
    this.hasAnalyses = true;
  }
}
