import { Component } from '@angular/core';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { NavBarComponent } from '@standalone/nav-bar/nav-bar.component';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'app-funding-dashboard',
  standalone: true,
  imports: [DashboardLayoutComponent, NavBarComponent, ButtonComponent],
  templateUrl: './funding-dashboard.component.html',
  styleUrl: './funding-dashboard.component.scss',
})
export class FundingDashboardComponent {}
