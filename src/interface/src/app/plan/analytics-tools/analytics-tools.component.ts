import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TileButtonComponent } from '../../../styleguide';
import { FeatureService } from '../../features/feature.service';
import { BreadcrumbService } from '@services/breadcrumb.service';

interface AnalyticTool {
  id: string;
  backgroundImage: string;
  title: string;
  subtitle: string;
  featureFlag: string;
  enabled: boolean;
}

@Component({
  selector: 'app-analytics-tools',
  standalone: true,
  imports: [CommonModule, TileButtonComponent],
  templateUrl: './analytics-tools.component.html',
  styleUrls: ['./analytics-tools.component.scss'],
})
export class AnalyticsToolsComponent implements OnInit {
  analyticsTools: AnalyticTool[] = [
    {
      id: 'climate-foresight',
      backgroundImage: '/assets/svg/climate-foresight.svg',
      title: 'Climate Foresight',
      subtitle: 'Integrate climate data...',
      featureFlag: 'CLIMATE_FORESIGHT',
      enabled: false,
    },
  ];

  hasEnabledTools: boolean = false;

  constructor(
    private breadcrumbService: BreadcrumbService,
    private featureService: FeatureService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.checkEnabledTools();
  }

  private checkEnabledTools(): void {
    this.analyticsTools.forEach((tool) => {
      tool.enabled = this.featureService.isFeatureEnabled(tool.featureFlag);
    });

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
