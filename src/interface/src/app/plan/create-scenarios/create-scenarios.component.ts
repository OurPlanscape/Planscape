import {
  animate,
  animateChild,
  group,
  query,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, Input, OnInit } from '@angular/core';
import { BehaviorSubject, take } from 'rxjs';
import {
  colorTransitionTrigger,
  opacityTransitionTrigger,
} from 'src/app/shared/animations';
import { colormapConfigToLegend, Legend, Plan } from 'src/app/types';

import { MapService } from './../../services/map.service';

@Component({
  selector: 'app-create-scenarios',
  templateUrl: './create-scenarios.component.html',
  styleUrls: ['./create-scenarios.component.scss'],
  animations: [
    trigger('expandCollapsePanel', [
      state(
        'expanded',
        style({
          backgroundColor: 'white',
          padding: '*',
          width: '700px',
        })
      ),
      state(
        'collapsed',
        style({
          backgroundColor: '#ebebeb',
          padding: '0px',
          width: '36px',
        })
      ),
      transition('expanded => collapsed', [
        group([
          query('@expandCollapseButton', animateChild()),
          query('@expandCollapsePanelContent', animateChild()),
          animate('300ms 100ms ease-out'),
        ]),
      ]),
      transition('collapsed => expanded', [
        group([
          query('@expandCollapseButton', animateChild()),
          query('@expandCollapsePanelContent', animateChild()),
          animate('250ms ease-out'),
        ]),
      ]),
    ]),
    colorTransitionTrigger({
      triggerName: 'expandCollapseButton',
      colorA: 'white',
      colorB: '#ebebeb',
      timingA: '300ms ease-out',
      timingB: '250ms ease-out',
    }),
    opacityTransitionTrigger({
      triggerName: 'expandCollapsePanelContent',
      timingA: '100ms ease-out',
      timingB: '100ms 250ms ease-out',
    }),
  ],
})
export class CreateScenariosComponent implements OnInit {
  @Input() plan$ = new BehaviorSubject<Plan | null>(null);

  readonly text1: string = `
    Scenarios consist of project areas identified by your priorities and constraints
    within the planning area. You can draw or upload your own project areas when creating
    scenarios or Planscape can recommend some project areas and scenarios within those
    project areas.
  `;

  readonly text2: string = `
    You can choose to use either Current Condition scores or Management Opportunity scores to
    inform your selection of priorities.
  `;

  readonly text3: string = `
    Define project areas based on choosing priorities based only on the current condition of
    the defined planning area. Future modeling is not considered in this mode.
  `;

  readonly text4: string = `
    Choose priorities using the Pillars of Resilience Framework. Priorities with higher
    opportunity scores (-1 to +1 range) represent how management value is greatest in the near
    term within the defined planning area. Future modeling is considered in this mode.
  `;

  readonly text5: string = `
    To learn more about how priorities are defined and used within this tool, visit
    linkaddresshere.
  `;

  legend: Legend | undefined;
  panelExpanded: boolean = true;

  constructor(private mapService: MapService) {}

  ngOnInit(): void {
    this.mapService
      .getColormap('viridis') // TODO(leehana): replace once colormaps are finalized
      .pipe(take(1))
      .subscribe((colormapConfig) => {
        this.legend = colormapConfigToLegend(colormapConfig);
      });
  }
}
