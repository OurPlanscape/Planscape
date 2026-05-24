import { Component, EventEmitter, Output } from '@angular/core';
import { FeatureService } from '@features/feature.service';
import { NgForOf } from '@angular/common';
import { TileButtonComponent } from '@styleguide';

@Component({
  selector: 'app-scenario-tools',
  standalone: true,
  imports: [NgForOf, TileButtonComponent],
  templateUrl: './scenario-tools.component.html',
  styleUrl: './scenario-tools.component.scss',
})
export class ScenarioToolsComponent {
  @Output() toolClicked = new EventEmitter<string>();

  scenarioDashboardTools = [
    {
      id: 'treatment-effects',
      backgroundImage: '/assets/svg/treatment-effects.svg',
      backgroundColor: '#dfede6',
      title: 'Treatment Effects',
      enabled: true,
    },
    this.featureService.isFeatureEnabled('FUNDING_REPORTS')
      ? {
          id: 'funding-opportunity-report',
          backgroundImage: '/assets/svg/funding.svg',
          backgroundColor: '#dfede6',
          title: 'Funding Opportunity Report',
          enabled: true,
        }
      : {
          id: 'coming-soon',
          backgroundImage: '/assets/svg/lock.svg',
          title: 'Coming Soon',
          enabled: false,
        },
  ];

  constructor(private featureService: FeatureService) {}

  onToolClick(toolId: string): void {
    if (toolId === 'treatment-effects') {
      this.toolClicked.emit('../treatment');
    }
    if (toolId === 'funding-opportunity-report') {
      this.toolClicked.emit('../funding');
    }
  }
}
