import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { ScenarioToolsComponent } from './scenario-tools.component';
import { ScenarioState } from '../scenario.state';
import { Capabilities } from '@types';

describe('ScenarioToolsComponent', () => {
  let component: ScenarioToolsComponent;
  let fixture: ComponentFixture<ScenarioToolsComponent>;
  let scenarioCapabilities$: BehaviorSubject<Capabilities[]>;

  beforeEach(async () => {
    scenarioCapabilities$ = new BehaviorSubject<Capabilities[]>([]);

    await TestBed.configureTestingModule({
      imports: [ScenarioToolsComponent],
      providers: [
        { provide: ScenarioState, useValue: { scenarioCapabilities$ } },
      ],
    }).compileComponents();
  });

  /** Builds the component for the given capability setup. */
  function setup(capabilities: Capabilities[] = []): ScenarioToolsComponent {
    scenarioCapabilities$.next(capabilities);
    fixture = TestBed.createComponent(ScenarioToolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return component;
  }

  /** Synchronously reads the current tool list (the source observable is sync). */
  function tools() {
    let value: { id: string; enabled: boolean }[] = [];
    component.scenarioDashboardTools$.subscribe((t) => (value = t));
    return value;
  }
  const toolIds = () => tools().map((t) => t.id);

  it('should create', () => {
    expect(setup()).toBeTruthy();
  });

  it('shows the treatment effects tool if the scenario has IMPACTS enabled', () => {
    setup(['IMPACTS']);
    expect(toolIds()).toContain('treatment-effects');
  });

  it('shows the funding report tile when the scenario has the capability', () => {
    setup(['FUNDING_REPORT']);
    expect(toolIds()).toContain('funding-opportunity-report');

    const funding = tools().find((t) => t.id === 'funding-opportunity-report');
    expect(funding?.enabled).toBeTrue();
  });

  it('hides the funding tile when the scenario lacks the capability', () => {
    setup(['IMPACTS']);
    expect(toolIds()).toEqual(['treatment-effects']);
  });

  it('hides all tiles when there are no capabilities', () => {
    setup([]);
    expect(toolIds()).toEqual([]);
  });

  it('reflects the capabilities of the current scenario as it changes', () => {
    setup(['IMPACTS']);
    expect(toolIds()).toEqual(['treatment-effects']);

    scenarioCapabilities$.next(['FUNDING_REPORT']);

    expect(toolIds()).toEqual(['funding-opportunity-report']);
  });

  it('emits the treatment route when the treatment tool is clicked', () => {
    setup(['IMPACTS', 'FUNDING_REPORT']);
    const emitted: string[] = [];
    component.toolClicked.subscribe((route) => emitted.push(route));

    component.onToolClick('treatment-effects');

    expect(emitted).toEqual(['../treatment']);
  });

  it('emits the funding route when the funding tool is clicked', () => {
    setup(['FUNDING_REPORT']);
    const emitted: string[] = [];
    component.toolClicked.subscribe((route) => emitted.push(route));

    component.onToolClick('funding-opportunity-report');

    expect(emitted).toEqual(['../funding']);
  });
});
