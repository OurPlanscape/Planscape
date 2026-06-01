import { Component, EventEmitter, Output } from '@angular/core';
import { FeatureService } from '@features/feature.service';
import { AsyncPipe, NgForOf } from '@angular/common';
import { TileButtonComponent } from '@styleguide';
import { Capabilities } from '@types';
import { map } from 'rxjs';
import { ScenarioState } from '../scenario.state';

interface ScenarioTool {
  id: string;
  backgroundImage: string;
  backgroundColor?: string;
  title: string;
  enabled: boolean;
}

@Component({
  selector: 'app-scenario-tools',
  standalone: true,
  imports: [AsyncPipe, NgForOf, TileButtonComponent],
  templateUrl: './scenario-tools.component.html',
  styleUrl: './scenario-tools.component.scss',
})
export class ScenarioToolsComponent {
  @Output() toolClicked = new EventEmitter<string>();

  scenarioDashboardTools$ = this.scenarioState.scenarioCapabilities$.pipe(
    map((capabilities) => this.buildTools(capabilities))
  );

  constructor(
    private featureService: FeatureService,
    private scenarioState: ScenarioState
  ) {}

  private buildTools(capabilities: Capabilities[]): ScenarioTool[] {
    const tools: ScenarioTool[] = [];

    // if the scenario does not have a subunits planning approach
    if (capabilities.includes('IMPACTS'))
      tools.push({
        id: 'treatment-effects',
        backgroundImage: '/assets/svg/treatment-effects.svg',
        backgroundColor: '#dfede6',
        title: 'Treatment Effects',
        enabled: true,
      });

    if (!this.featureService.isFeatureEnabled('FUNDING_REPORTS')) {
      // coming soon if feature flag is off
      tools.push({
        id: 'coming-soon',
        backgroundImage: '/assets/svg/lock.svg',
        title: 'Coming Soon',
        enabled: false,
      });
    } else if (capabilities.includes('FUNDING_REPORT')) {
      // add item if scenario has capabilities
      tools.push({
        id: 'funding-opportunity-report',
        backgroundImage: '/assets/svg/funding.svg',
        backgroundColor: '#dfede6',
        title: 'Funding Opportunity Report',
        enabled: true,
      });
    }
    return tools;
  }

  onToolClick(toolId: string): void {
    if (toolId === 'treatment-effects') {
      this.toolClicked.emit('../treatment');
    }
    if (toolId === 'funding-opportunity-report') {
      this.toolClicked.emit('../funding');
    }
  }
}
