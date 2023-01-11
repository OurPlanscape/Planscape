import { Plan } from 'src/app/types';
import { BehaviorSubject } from 'rxjs';
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
import { Component, OnInit, Input } from '@angular/core';

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
    trigger('expandCollapseButton', [
      state(
        'expanded',
        style({
          backgroundColor: 'white',
        })
      ),
      state(
        'collapsed',
        style({
          backgroundColor: '#ebebeb',
        })
      ),
      transition('expanded => collapsed', [animate('300ms ease-out')]),
      transition('collapsed => expanded', [animate('250ms ease-out')]),
    ]),
    trigger('expandCollapsePanelContent', [
      state(
        'expanded',
        style({
          opacity: 1,
        })
      ),
      state(
        'collapsed',
        style({
          opacity: 0,
        })
      ),
      transition('expanded => collapsed', [animate('100ms ease-out')]),
      transition('collapsed => expanded', [animate('100ms 250ms ease-out')]),
    ]),
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

  panelExpanded: boolean = true;

  constructor() {}

  ngOnInit(): void {}
}
