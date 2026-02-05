import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanningAnalyticsToolsComponent } from '@app/plan/analytics-tools/planning-analytics-tools.component';
import { FeatureService } from '@app/features/feature.service';
import { Router, ActivatedRoute } from '@angular/router';
import { PlanState } from '@app/plan/plan.state';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { of } from 'rxjs';
import { Plan } from '@types';

describe('PlanningAnalyticsToolsComponent', () => {
  let component: PlanningAnalyticsToolsComponent;
  let fixture: ComponentFixture<PlanningAnalyticsToolsComponent>;
  let mockFeatureService: jasmine.SpyObj<FeatureService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockPlanState: jasmine.SpyObj<PlanState>;
  let mockBreadcrumbService: jasmine.SpyObj<BreadcrumbService>;

  const mockPlan: Plan = {
    id: 1,
    name: 'Test Plan',
    area_acres: 1000,
    area_m2: 1000,
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
    },
    user: 1,
    role: 'Test Region',
    created_at: '2024-01-01',
    creator: 'Test Creator',
    scenario_count: 0,
    latest_updated: '2024-01-01',
    capabilities: [],
    permissions: ['read', 'write'],
  };

  beforeEach(async () => {
    mockFeatureService = jasmine.createSpyObj('FeatureService', [
      'isFeatureEnabled',
    ]);
    mockFeatureService.isFeatureEnabled.and.returnValue(true);

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockActivatedRoute = {
      snapshot: {
        data: {
          planId: 1,
        },
      },
    };

    mockPlanState = jasmine.createSpyObj('PlanState', [], {
      currentPlan$: of(mockPlan),
    });

    mockBreadcrumbService = jasmine.createSpyObj('BreadcrumbService', [
      'updateBreadCrumb',
    ]);

    await TestBed.configureTestingModule({
      imports: [PlanningAnalyticsToolsComponent],
      providers: [
        { provide: FeatureService, useValue: mockFeatureService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PlanState, useValue: mockPlanState },
        { provide: BreadcrumbService, useValue: mockBreadcrumbService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningAnalyticsToolsComponent);
    component = fixture.componentInstance;
    component.planningAreaCapabilities = ['CLIMATE_FORESIGHT'];
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize analytics tools with correct properties', () => {
    mockFeatureService.isFeatureEnabled.and.returnValue(true);
    fixture.detectChanges();
    expect(component.analyticsTools.length).toBe(1);
    expect(component.analyticsTools[0].id).toBe('climate-foresight');
    expect(component.analyticsTools[0].title).toBe('Climate Foresight');
    expect(component.analyticsTools[0].subtitle).toBe(
      'Integrate climate data...'
    );
  });

  it('should hide container when no tools are enabled', () => {
    component.planningAreaCapabilities = [];
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector(
      '.analytics-tools-container'
    );
    expect(container).toBeNull();
  });

  it('should show container when climate foresight is enabled', () => {
    mockFeatureService.isFeatureEnabled.and.returnValue(true);
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector(
      '.analytics-tools-container'
    );
    expect(container).toBeTruthy();
  });

  it('should display correct number of enabled tools', () => {
    mockFeatureService.isFeatureEnabled.and.returnValue(true);
    fixture.detectChanges();
    const tools = fixture.nativeElement.querySelectorAll('sg-tile-button');
    expect(tools.length).toBe(1);
  });

  it('should display tool properties correctly', () => {
    mockFeatureService.isFeatureEnabled.and.returnValue(true);
    fixture.detectChanges();

    const firstTool = fixture.nativeElement.querySelector('sg-tile-button');
    expect(firstTool).toBeTruthy();
    expect(firstTool.getAttribute('ng-reflect-title')).toBe(
      'Climate Foresight'
    );
    expect(firstTool.getAttribute('ng-reflect-subtitle')).toBe(
      'Integrate climate data...'
    );
  });

  it('should navigate to climate-foresight when climate tool is clicked', () => {
    component.onToolClick('climate-foresight');

    expect(mockBreadcrumbService.updateBreadCrumb).toHaveBeenCalledWith({
      label: 'Climate Foresight',
      backUrl: '/plan/1',
    });
    expect(mockRouter.navigate).toHaveBeenCalledWith([
      '/plan',
      1,
      'climate-foresight',
    ]);
  });

  it('should not navigate for unsupported tool IDs', () => {
    component.onToolClick('unsupported-tool');

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should handle click events on tool cards', () => {
    mockFeatureService.isFeatureEnabled.and.returnValue(true);
    spyOn(component, 'onToolClick');
    fixture.detectChanges();

    const toolCard = fixture.nativeElement.querySelector('sg-tile-button');
    expect(toolCard).toBeTruthy();
    toolCard.dispatchEvent(new CustomEvent('tileClick'));

    expect(component.onToolClick).toHaveBeenCalledWith('climate-foresight');
  });

  it('should display subtitle correctly', () => {
    mockFeatureService.isFeatureEnabled.and.returnValue(true);
    fixture.detectChanges();

    const toolCard = fixture.nativeElement.querySelector('sg-tile-button');
    expect(toolCard).toBeTruthy();
    expect(toolCard.getAttribute('ng-reflect-subtitle')).toContain(
      'Integrate climate data'
    );
  });

  it('should handle missing planId gracefully', () => {
    mockActivatedRoute.snapshot.data.planId = null;

    component.onToolClick('climate-foresight');
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(mockBreadcrumbService.updateBreadCrumb).not.toHaveBeenCalled();
  });

  it('should filter tools based on feature flags', () => {
    mockFeatureService.isFeatureEnabled.and.callFake((feature: string) => {
      return feature === 'CLIMATE_FORESIGHT';
    });

    component.ngOnInit();
    const enabledTools = component.analyticsTools.filter(
      (tool) => tool.enabled
    );
    expect(enabledTools.length).toBe(1);
    expect(enabledTools[0].id).toBe('climate-foresight');
  });

  it('should set hasEnabledTools to false when no tools are enabled', () => {
    mockFeatureService.isFeatureEnabled.and.returnValue(false);

    component.ngOnInit();
    expect(component.hasEnabledTools).toBe(false);
  });
});
