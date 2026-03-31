import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TileButtonComponent } from '@styleguide';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { Capabilities } from '@types';

interface AnalyticTool {
  id: string;
  backgroundImage: string;
  backgroundColor?: string;
  localClass?: string;
  title: string;
  subtitle: string;
  featureFlag: string;
  enabled: boolean;
}

@Component({
  selector: 'app-planning-analytics-tools',
  standalone: true,
  imports: [CommonModule, TileButtonComponent, NgClass],
  templateUrl: './planning-analytics-tools.component.html',
  styleUrls: ['./planning-analytics-tools.component.scss'],
})
export class PlanningAnalyticsToolsComponent implements OnInit {
  @Input() planningAreaCapabilities: Capabilities[] = [];
  analyticsTools: AnalyticTool[] = [];

  hasEnabledTools: boolean = false;

  constructor(
    private breadcrumbService: BreadcrumbService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initEnabledTools();
  }

  /**
   * We will add tools based on the logic related to each tool
   */
  private initEnabledTools(): void {
    // CLIMATE FORESIGHT TOOL
    if (this.planningAreaCapabilities.includes('CLIMATE_FORESIGHT')) {
      this.analyticsTools.push({
        id: 'climate-foresight',
        backgroundImage: '/assets/svg/climate-foresight.svg',
        backgroundColor: '#dfede6',
        title: 'Climate Foresight',
        localClass: 'climate-foresight',
        subtitle: 'Integrate climate data...',
        featureFlag: '',
        enabled: true,
      });
    }
    if (this.planningAreaCapabilities.includes('CLIMATE_FORESIGHT')) {
      this.analyticsTools.push({
        id: 'coming-soon',
        backgroundImage: '/assets/svg/lock.svg',
        title: 'Coming Soon',
        localClass: 'coming-soon',
        subtitle: '',
        featureFlag: '',
        enabled: false,
      });
    }

    this.hasEnabledTools = this.analyticsTools.some((tool) => tool.enabled);
  }

  onToolClick(toolId: string): void {
    if (toolId === 'climate-foresight') {
      const planId = this.route.snapshot.data['planId'];
      if (planId) {
        this.breadcrumbService.updateBreadCrumb({
          label: 'Climate Foresight',
          backUrl: `/plan/${planId}`,
        });
        this.router.navigate(['/plan', planId, 'climate-foresight']);
      }
    }
  }
}
