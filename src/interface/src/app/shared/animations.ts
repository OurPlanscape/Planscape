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

export const colorTransitionTrigger = (params: {
  triggerName: string;
  colorA: string;
  colorB: string;
  timingA: string;
  timingB: string;
}) =>
  trigger(params.triggerName, [
    state(
      'colorA',
      style({
        backgroundColor: params.colorA,
      })
    ),
    state(
      'colorB',
      style({
        backgroundColor: params.colorB,
      })
    ),
    transition('colorA => colorB', [animate(params.timingA)]),
    transition('colorB => colorA', [animate(params.timingB)]),
  ]);

export const opacityTransitionTrigger = (params: {
  triggerName: string;
  timingA: string;
  timingB: string;
}) =>
  trigger(params.triggerName, [
    state(
      'opaque',
      style({
        opacity: 1,
      })
    ),
    state(
      'transparent',
      style({
        opacity: 0,
      })
    ),
    transition('opaque => transparent', [animate(params.timingA)]),
    transition('transparent => opaque', [animate(params.timingB)]),
  ]);

export const expandCollapsePanelTrigger = trigger('expandCollapsePanel', [
  state(
    'expanded',
    style({
      backgroundColor: 'white',
      padding: '*',
      maxWidth: '700px',
    })
  ),
  state(
    'collapsed',
    style({
      backgroundColor: '#ebebeb',
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
]);
