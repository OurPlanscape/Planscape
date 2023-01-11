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
import { Component, OnInit } from '@angular/core';

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
          padding: '32px',
          width: '700px',
        })
      ),
      state(
        'collapsed',
        style({
          backgroundColor: '#ebebeb',
          padding: '32px 0px',
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
  panelExpanded: boolean = true;

  constructor() {}

  ngOnInit(): void {}
}
