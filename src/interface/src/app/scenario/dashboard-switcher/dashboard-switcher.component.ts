import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ScenarioDashboardComponent } from '../scenario-dashboard/scenario-dashboard.component';
import { ProjectAreaDashboardComponent } from '../project-area-dashboard/project-area-dashboard.component';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-dashboard-switcher',
  templateUrl: 'dashboard-switcher.component.html',
  standalone: true,

  imports: [NgIf, ProjectAreaDashboardComponent, ScenarioDashboardComponent],
})
export class DashboardSwitcherComponent implements OnInit {
  inProjectArea = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.inProjectArea = this.router.url.includes('/project-area');
  }
}
