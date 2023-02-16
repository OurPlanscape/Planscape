import { Component, OnInit } from '@angular/core';
import {
  colorTransitionTrigger,
  opacityTransitionTrigger,
  triggerAnimation,
} from 'src/app/shared/animations';

@Component({
  selector: 'app-scenario-details',
  templateUrl: './scenario-details.component.html',
  styleUrls: ['./scenario-details.component.scss'],
  animations: [
    triggerAnimation,
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
export class ScenarioDetailsComponent implements OnInit {
  panelExpanded: boolean = true;

  constructor() {}

  ngOnInit(): void {}

}
