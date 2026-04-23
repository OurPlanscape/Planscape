import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SharedModule } from '@app/shared';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';

@UntilDestroy()
@Component({
  selector: 'app-scenario-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    DashboardLayoutComponent,
    NavBarComponent,
  ],
  templateUrl: './scenario-dashboard.component.html',
  styleUrl: './scenario-dashboard.component.scss',
})
export class ScenarioDashboardComponent {}
