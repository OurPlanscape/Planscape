import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { TileButtonComponent } from '@styleguide';
import { Capabilities } from '@types';
import { map } from 'rxjs';
import { ScenarioState } from '../scenario.state';
import { DetailsCardComponent } from '@styleguide/details-card/details-card.component';

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
  imports: [
    AsyncPipe,
    DetailsCardComponent,
    NgForOf,
    NgIf,
    TileButtonComponent,
  ],
  templateUrl: './scenario-tools.component.html',
  styleUrl: './scenario-tools.component.scss',
})
export class ScenarioToolsComponent {
  @Output() toolClicked = new EventEmitter<string>();
  @Input() cardTitle = '';
  @Input() subtitle = '';

  scenarioDashboardTools$ = this.scenarioState.scenarioCapabilities$.pipe(
    map((capabilities) => this.buildTools(capabilities))
  );

  constructor(private scenarioState: ScenarioState) {}

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

    // add item if scenario has capabilities
    if (capabilities.includes('FUNDING_REPORT')) {
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
