import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClimateForesightComponent } from './climate-foresight.component';
import { Router, ActivatedRoute } from '@angular/router';
import { PlanState } from '../plan.state';
import { AuthService, WINDOW } from '@services';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { of } from 'rxjs';
import { Plan } from '@types';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Map as MapLibreMap, ResourceType } from 'maplibre-gl';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ClimateForesightComponent', () => {
  let component: ClimateForesightComponent;
  let fixture: ComponentFixture<ClimateForesightComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockPlanState: jasmine.SpyObj<PlanState>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockMapConfigState: jasmine.SpyObj<MapConfigState>;
  let mockBreadcrumbService: jasmine.SpyObj<BreadcrumbService>;

  const mockPlan: Plan = {
    id: 123,
    name: 'Test Planning Area',
    area_acres: 5000,
    area_m2: 5000,
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-119.6, 37.9],
            [-119.5, 37.9],
            [-119.5, 38.0],
            [-119.6, 38.0],
            [-119.6, 37.9],
          ],
        ],
      ],
    },
    user: 1,
    role: 'Test Role',
    created_at: '2024-01-01',
    creator: 'Test Creator',
    scenario_count: 2,
    latest_updated: '2024-01-01',
    permissions: ['read', 'write'],
  };

  const mockBreadcrumb = {
    label: 'Test Breadcrumb',
    backUrl: '/test',
  };

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockActivatedRoute = {
      snapshot: {
        data: {
          planId: 123,
        },
      },
    };

    mockPlanState = jasmine.createSpyObj('PlanState', ['setPlanId'], {
      currentPlan$: of(mockPlan),
      currentPlanId$: of(123),
      planningAreaGeometry$: of(mockPlan.geometry),
    });

    mockAuthService = jasmine.createSpyObj('AuthService', ['getAuthCookie']);
    mockAuthService.getAuthCookie.and.returnValue('test-auth-cookie');

    mockMapConfigState = jasmine.createSpyObj('MapConfigState', [], {
      baseMapUrl$: of('https://test-map-url.com/style.json'),
    });

    mockBreadcrumbService = jasmine.createSpyObj(
      'BreadcrumbService',
      ['updateBreadCrumb'],
      {
        breadcrumb$: of(mockBreadcrumb),
      }
    );

    await TestBed.configureTestingModule({
      imports: [
        ClimateForesightComponent,
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
      ],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PlanState, useValue: mockPlanState },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MapConfigState, useValue: mockMapConfigState },
        { provide: BreadcrumbService, useValue: mockBreadcrumbService },
        { provide: WINDOW, useValue: window },
      ],
      schemas: [NO_ERRORS_SCHEMA], // Ignore MapLibre component errors
    }).compileComponents();

    fixture = TestBed.createComponent(ClimateForesightComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct default values', () => {
    expect(component.planName).toBe('');
    expect(component.planAcres).toBe('');
    expect(component.hasAnalyses).toBeFalse();
    expect(component.currentPlan).toBeNull();
    expect(component.mapLibreMap).toBeUndefined();
  });

  it('should load plan data on init', () => {
    fixture.detectChanges();

    expect(component.currentPlan).toEqual(mockPlan);
    expect(component.planName).toBe('Test Planning Area');
    expect(component.planAcres).toBe('Acres: 5,000');
  });

  it('should handle plan without area_acres', async () => {
    const planWithoutAcres = { ...mockPlan, area_acres: 0 };
    const mockPlanStateNoAcres = jasmine.createSpyObj(
      'PlanState',
      ['setPlanId'],
      {
        currentPlan$: of(planWithoutAcres),
        currentPlanId$: of(123),
        planningAreaGeometry$: of(mockPlan.geometry),
      }
    );

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        ClimateForesightComponent,
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
      ],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PlanState, useValue: mockPlanStateNoAcres },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MapConfigState, useValue: mockMapConfigState },
        { provide: BreadcrumbService, useValue: mockBreadcrumbService },
        { provide: WINDOW, useValue: window },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const localFixture = TestBed.createComponent(ClimateForesightComponent);
    const localComponent = localFixture.componentInstance;
    localFixture.detectChanges();

    expect(localComponent.planAcres).toBe('');
  });

  it('should update breadcrumb on init', () => {
    fixture.detectChanges();

    expect(mockBreadcrumbService.updateBreadCrumb).toHaveBeenCalledWith({
      label: 'Climate Foresight',
      backUrl: '/plan/123',
    });
  });

  it('should not update breadcrumb if already set to Climate Foresight', async () => {
    const mockBreadcrumbAlreadySet = jasmine.createSpyObj(
      'BreadcrumbService',
      ['updateBreadCrumb'],
      {
        breadcrumb$: of({
          label: 'Climate Foresight',
          backUrl: '/plan/123',
        }),
      }
    );

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        ClimateForesightComponent,
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
      ],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PlanState, useValue: mockPlanState },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MapConfigState, useValue: mockMapConfigState },
        { provide: BreadcrumbService, useValue: mockBreadcrumbAlreadySet },
        { provide: WINDOW, useValue: window },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const localFixture = TestBed.createComponent(ClimateForesightComponent);
    localFixture.detectChanges();

    expect(mockBreadcrumbAlreadySet.updateBreadCrumb).not.toHaveBeenCalled();
  });

  it('should handle null plan gracefully', async () => {
    const mockPlanStateNull = jasmine.createSpyObj('PlanState', ['setPlanId'], {
      currentPlan$: of(null),
      currentPlanId$: of(null),
      planningAreaGeometry$: of(null),
    });

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        ClimateForesightComponent,
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
      ],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PlanState, useValue: mockPlanStateNull },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MapConfigState, useValue: mockMapConfigState },
        { provide: BreadcrumbService, useValue: mockBreadcrumbService },
        { provide: WINDOW, useValue: window },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const localFixture = TestBed.createComponent(ClimateForesightComponent);
    localFixture.detectChanges();

    expect(localFixture.componentInstance.currentPlan).toBeNull();
    expect(localFixture.componentInstance.planName).toBe('');
    expect(localFixture.componentInstance.planAcres).toBe('');
  });

  it('should set map reference when map is loaded', () => {
    const mockMap = {} as MapLibreMap;

    component.mapLoaded(mockMap);

    expect(component.mapLibreMap).toBe(mockMap);
  });

  it('should transform request with auth headers', () => {
    const url = 'https://test-api.com/tiles';
    const result = component.transformRequest(url, ResourceType.Tile);

    expect(mockAuthService.getAuthCookie).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should navigate back to plan on navigateBack', () => {
    component.navigateBack();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/plan', 123]);
  });

  it('should navigate to home when no planId in route on navigateBack', () => {
    mockActivatedRoute.snapshot.data.planId = null;

    component.navigateBack();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should set hasAnalyses to true when startAnalysis is called', () => {
    expect(component.hasAnalyses).toBeFalse();

    component.startAnalysis();

    expect(component.hasAnalyses).toBeTrue();
  });

  it('should calculate bounds from geometry', (done) => {
    component.bounds$.subscribe((bounds) => {
      expect(bounds).toBeDefined();
      // Bounds should be an array with 4 numbers [west, south, east, north]
      expect(Array.isArray(bounds)).toBeTrue();
      if (bounds) {
        expect(bounds.length).toBe(4);
        expect(bounds[0]).toBeLessThan(bounds[2]); // west < east
        expect(bounds[1]).toBeLessThan(bounds[3]); // south < north
      }
      done();
    });
  });

  it('should get base layer URL from map config state', (done) => {
    component.baseLayerUrl$.subscribe((url) => {
      expect(url).toBe('https://test-map-url.com/style.json');
      done();
    });
  });

  it('should have correct min and max zoom levels', () => {
    expect(component.minZoom).toBeDefined();
    expect(component.maxZoom).toBeDefined();
    expect(component.minZoom).toBeLessThan(component.maxZoom);
  });

  it('should display planning area name in template', () => {
    fixture.detectChanges();

    const planNameElement = fixture.nativeElement.querySelector(
      '.planning-area-name'
    );
    expect(planNameElement?.textContent).toContain('Test Planning Area');
  });

  it('should display acres information in template', () => {
    fixture.detectChanges();

    const acresElement = fixture.nativeElement.querySelector('.acres-info');
    expect(acresElement?.textContent).toContain('Acres: 5,000');
  });

  it('should show empty state when no analyses', () => {
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.no-analyses');
    expect(emptyState).toBeTruthy();
    expect(emptyState?.textContent).toContain('No Analyses Yet');
  });

  it('should hide empty state when analyses exist', () => {
    component.hasAnalyses = true;
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.no-analyses');
    const analysesList = fixture.nativeElement.querySelector('.analyses-list');

    expect(emptyState).toBeFalsy();
    expect(analysesList).toBeTruthy();
  });

  it('should display start analysis button', () => {
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.start-analysis-btn');
    expect(button).toBeTruthy();
    expect(button?.textContent).toContain('Start Analysis');
  });

  it('should call startAnalysis when button is clicked', () => {
    spyOn(component, 'startAnalysis');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.start-analysis-btn');
    button?.click();

    expect(component.startAnalysis).toHaveBeenCalled();
  });

  it('should display Climate Foresight tool information', () => {
    fixture.detectChanges();

    const toolTitle = fixture.nativeElement.querySelector('.tool-header h2');
    const toolDescription = fixture.nativeElement.querySelector(
      '.tool-description p'
    );

    expect(toolTitle?.textContent).toContain('Climate Foresight');
    expect(toolDescription?.textContent).toContain('mid-21st century climate');
  });

  it('should display USFS logo and developer info', () => {
    fixture.detectChanges();

    const devInfo = fixture.nativeElement.querySelector('.developed-by');
    const usfsLogo = fixture.nativeElement.querySelector('img[alt="USFS"]');

    expect(devInfo?.textContent).toContain('USFS');
    expect(usfsLogo).toBeTruthy();
  });

  it('should render map component when bounds are available', () => {
    fixture.detectChanges();

    const mapElement = fixture.nativeElement.querySelector('mgl-map');
    expect(mapElement).toBeTruthy();
  });

  it('should not render map when geometry is null', async () => {
    const mockPlanStateNoBounds = jasmine.createSpyObj(
      'PlanState',
      ['setPlanId'],
      {
        currentPlan$: of(mockPlan),
        currentPlanId$: of(123),
        planningAreaGeometry$: of(null),
      }
    );

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        ClimateForesightComponent,
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
      ],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PlanState, useValue: mockPlanStateNoBounds },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MapConfigState, useValue: mockMapConfigState },
        { provide: BreadcrumbService, useValue: mockBreadcrumbService },
        { provide: WINDOW, useValue: window },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const localFixture = TestBed.createComponent(ClimateForesightComponent);
    localFixture.detectChanges();

    // When geometry is null, the component now returns null bounds which prevents map from rendering
    const mapElement = localFixture.nativeElement.querySelector('mgl-map');
    expect(mapElement).toBeFalsy();
  });

  it('should set mapLibreMap when mapLoaded is called', () => {
    const mockMap = {} as MapLibreMap;

    expect(component.mapLibreMap).toBeUndefined();
    component.mapLoaded(mockMap);
    expect(component.mapLibreMap).toBe(mockMap);
  });
});
