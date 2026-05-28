import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { ScenarioToolsComponent } from './scenario-tools.component';
import { FeatureService } from '@features/feature.service';
import { ScenarioState } from '../scenario.state';
import { Capabilities } from '@types';

describe('ScenarioToolsComponent', () => {
  let component: ScenarioToolsComponent;
  let fixture: ComponentFixture<ScenarioToolsComponent>;
  let mockFeatureService: jasmine.SpyObj<FeatureService>;
  let scenarioCapabilities$: BehaviorSubject<Capabilities[]>;

  beforeEach(async () => {
    mockFeatureService = jasmine.createSpyObj('FeatureService', [
      'isFeatureEnabled',
    ]);
    scenarioCapabilities$ = new BehaviorSubject<Capabilities[]>([]);

    await TestBed.configureTestingModule({
      imports: [ScenarioToolsComponent],
      providers: [
        { provide: FeatureService, useValue: mockFeatureService },
        { provide: ScenarioState, useValue: { scenarioCapabilities$ } },
      ],
    }).compileComponents();
  });

  /** Builds the component for the given feature/capability setup. */
  function setup(
    featureEnabled: boolean,
    capabilities: Capabilities[] = []
  ): ScenarioToolsComponent {
    mockFeatureService.isFeatureEnabled.and.returnValue(featureEnabled);
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
    expect(setup(false)).toBeTruthy();
  });

  it('checks the FUNDING_REPORTS feature flag', () => {
    setup(false);
    toolIds();
    expect(mockFeatureService.isFeatureEnabled).toHaveBeenCalledWith(
      'FUNDING_REPORTS'
    );
  });

  it('always shows the treatment effects tool', () => {
    setup(true, ['FUNDING_REPORT']);
    expect(toolIds()).toContain('treatment-effects');
  });

  it('shows the coming-soon tile when the feature is off (regardless of capability)', () => {
    setup(false, ['FUNDING_REPORT']);
    expect(toolIds()).toEqual(['treatment-effects', 'coming-soon']);

    const comingSoon = tools().find((t) => t.id === 'coming-soon');
    expect(comingSoon?.enabled).toBeFalse();
  });

  it('shows the funding report tile when the feature is on and the scenario has the capability', () => {
    setup(true, ['FUNDING_REPORT']);
    expect(toolIds()).toEqual([
      'treatment-effects',
      'funding-opportunity-report',
    ]);

    const funding = tools().find((t) => t.id === 'funding-opportunity-report');
    expect(funding?.enabled).toBeTrue();
  });

  it('hides the funding tile when the feature is on but the scenario lacks the capability', () => {
    setup(true, ['IMPACTS']);
    expect(toolIds()).toEqual(['treatment-effects']);
  });

  it('hides the funding tile when the feature is on and there are no capabilities', () => {
    setup(true, []);
    expect(toolIds()).toEqual(['treatment-effects']);
  });

  it('reflects the capabilities of the current scenario as it changes', () => {
    setup(true, []);
    expect(toolIds()).toEqual(['treatment-effects']);

    scenarioCapabilities$.next(['FUNDING_REPORT']);

    expect(toolIds()).toContain('funding-opportunity-report');
  });

  it('emits the treatment route when the treatment tool is clicked', () => {
    setup(true, ['FUNDING_REPORT']);
    const emitted: string[] = [];
    component.toolClicked.subscribe((route) => emitted.push(route));

    component.onToolClick('treatment-effects');

    expect(emitted).toEqual(['../treatment']);
  });

  it('emits the funding route when the funding tool is clicked', () => {
    setup(true, ['FUNDING_REPORT']);
    const emitted: string[] = [];
    component.toolClicked.subscribe((route) => emitted.push(route));

    component.onToolClick('funding-opportunity-report');

    expect(emitted).toEqual(['../funding']);
  });

  it('does not emit for the coming-soon tile', () => {
    setup(false);
    const emitted: string[] = [];
    component.toolClicked.subscribe((route) => emitted.push(route));

    component.onToolClick('coming-soon');

    expect(emitted).toEqual([]);
  });
});
