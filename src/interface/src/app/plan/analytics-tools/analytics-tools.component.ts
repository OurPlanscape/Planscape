import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TileButtonComponent } from '../../../styleguide';
import { FeatureService } from '../../features/feature.service';

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

  constructor(private featureService: FeatureService) {}

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
    // TODO: Implement analytics tool click handler
  }
}
