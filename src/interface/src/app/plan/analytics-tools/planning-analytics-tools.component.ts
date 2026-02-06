import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TileButtonComponent } from '@styleguide';
import { FeatureService } from '@features/feature.service';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { Capabilities } from '@types';

interface AnalyticTool {
  id: string;
  backgroundImage: string;
  title: string;
  subtitle: string;
  featureFlag: string;
  enabled: boolean;
}

@Component({
  selector: 'app-planning-analytics-tools',
  standalone: true,
  imports: [CommonModule, TileButtonComponent],
  templateUrl: './planning-analytics-tools.component.html',
  styleUrls: ['./planning-analytics-tools.component.scss'],
})
export class PlanningAnalyticsToolsComponent implements OnInit {
  @Input() planningAreaCapabilities: Capabilities[] = [];
  analyticsTools: AnalyticTool[] = [];

  hasEnabledTools: boolean = false;

  constructor(
    private breadcrumbService: BreadcrumbService,
    private featureService: FeatureService,
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
    if (
      this.featureService.isFeatureEnabled('CLIMATE_FORESIGHT') &&
      this.planningAreaCapabilities.includes('CLIMATE_FORESIGHT')
    ) {
      this.analyticsTools.push({
        id: 'climate-foresight',
        backgroundImage: '/assets/svg/climate-foresight.svg',
        title: 'Climate Foresight',
        subtitle: 'Integrate climate data...',
        featureFlag: 'CLIMATE_FORESIGHT',
        enabled: true,
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
