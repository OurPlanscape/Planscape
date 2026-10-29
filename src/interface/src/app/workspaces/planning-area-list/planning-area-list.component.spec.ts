import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanningAreaListComponent } from './planning-area-list.component';
import { PlanningAreasDataSource } from '@app/standalone/planning-areas/planning-areas.datasource';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';
import { AuthService, WebSocketService } from '@app/services';
import { BehaviorSubject, filter, of, Subject, throwError } from 'rxjs';
import { MockProviders } from 'ng-mocks';
import { MapService } from '@maplibre/ngx-maplibre-gl';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceState } from '../workspace.state';
import {
  PLANNING_AREA_CREATED_EVENT,
  PLANNING_AREA_DELETED_EVENT,
  PLANNING_AREA_MAP_STATUS_EVENT,
  REALTIME_CONNECTED_EVENT,
  Workspace,
  WorkspaceEvent,
} from '@types';

describe('PlanningAreaListComponent', () => {
  let component: PlanningAreaListComponent;
  let fixture: ComponentFixture<PlanningAreaListComponent>;

  let dataSourceMock: jasmine.SpyObj<PlanningAreasDataSource>;
  let mapConfigStateMock: jasmine.SpyObj<MapConfigState>;
  let newScenarioStateMock: jasmine.SpyObj<NewScenarioState>;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let currentWorkspace$: BehaviorSubject<Workspace>;
  let workspaceEvents$: Subject<WorkspaceEvent>;

  const workspaceWith = (permissions: string[]) =>
    ({ permissions }) as unknown as Workspace;

  const planningAreas$ = of([]);
  const pages$ = of(3);
  const loading$ = new BehaviorSubject<boolean>(false);
  const baseMapUrl$ = of('test-style-url');

  beforeEach(async () => {
    dataSourceMock = jasmine.createSpyObj<PlanningAreasDataSource>(
      'PlanningAreasDataSource',
      [
        'data',
        'loadData',
        'search',
        'changeSort',
        'goToPage',
        'changePageSize',
        'destroy',
        'refresh',
      ],
      {
        pageOptions: {
          page: 1,
          limit: 10,
        },
        pages$,
        loading$,
      }
    );

    dataSourceMock.data.and.returnValue(planningAreas$);
    dataSourceMock.refresh.and.returnValue(of({ count: 0, results: [] }));

    mapConfigStateMock = jasmine.createSpyObj<MapConfigState>(
      'MapConfigState',
      ['setShowMapControls'],
      {
        baseMapUrl$,
      }
    );

    newScenarioStateMock = jasmine.createSpyObj<NewScenarioState>(
      'NewScenarioState',
      ['showMapError']
    );

    authServiceMock = jasmine.createSpyObj<AuthService>('AuthService', [
      'getAuthCookie',
    ]);

    authServiceMock.getAuthCookie.and.returnValue('cookie');

    currentWorkspace$ = new BehaviorSubject(
      workspaceWith(['add_planningarea'])
    );

    // the page around the list owns the connection; here we just feed events
    workspaceEvents$ = new Subject<WorkspaceEvent>();

    await TestBed.configureTestingModule({
      imports: [PlanningAreaListComponent],
    })
      .overrideComponent(PlanningAreaListComponent, {
        set: {
          providers: [
            MockProviders(MapService, Router),
            {
              provide: PlanningAreasDataSource,
              useValue: dataSourceMock,
            },
            {
              provide: MapConfigState,
              useValue: mapConfigStateMock,
            },
            {
              provide: NewScenarioState,
              useValue: newScenarioStateMock,
            },
            {
              provide: AuthService,
              useValue: authServiceMock,
            },
            {
              provide: WorkspaceState,
              useValue: { currentWorkspace$ },
            },
            {
              provide: WebSocketService,
              useValue: {
                on: (type: string) =>
                  workspaceEvents$.pipe(filter((event) => event.type === type)),
              },
            },
            {
              provide: ActivatedRoute,
              useValue: {
                snapshot: {
                  data: {
                    workspaceId: 1,
                  },
                },
              },
            },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PlanningAreaListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('loads planning area data', () => {
      component.ngOnInit();

      expect(dataSourceMock.loadData).toHaveBeenCalled();
    });

    it('hides map controls', () => {
      component.ngOnInit();

      expect(mapConfigStateMock.setShowMapControls).toHaveBeenCalledWith(false);
    });
  });

  describe('following the workspace', () => {
    const event = (type: string): WorkspaceEvent => ({
      type,
      workspace_id: 1,
      object: { kind: 'planning_area', id: 3 },
    });

    beforeEach(() => component.ngOnInit());

    it('asks for the list again when a planning area is created', () => {
      workspaceEvents$.next(event(PLANNING_AREA_CREATED_EVENT));

      expect(dataSourceMock.refresh.calls.count()).toBe(1);
    });

    it('asks for the list again when a planning area is deleted', () => {
      workspaceEvents$.next(event(PLANNING_AREA_DELETED_EVENT));

      expect(dataSourceMock.refresh.calls.count()).toBe(1);
    });

    it('asks for the list again when the map of one is ready', () => {
      workspaceEvents$.next(event(PLANNING_AREA_MAP_STATUS_EVENT));

      expect(dataSourceMock.refresh.calls.count()).toBe(1);
    });

    it('asks for the list again whenever the connection is made', () => {
      // events are not replayed, so a reconnection can hide a change
      workspaceEvents$.next(event(REALTIME_CONNECTED_EVENT));

      expect(dataSourceMock.refresh.calls.count()).toBe(1);
    });

    it('ignores the events that say nothing about the list', () => {
      workspaceEvents$.next(event('planning.scenario.status_changed'));
      workspaceEvents$.next(event('planning.scenario.created'));

      expect(dataSourceMock.refresh).not.toHaveBeenCalled();
    });

    it('does not ask again while a refresh is in flight', () => {
      const longRefresh$ = new Subject<any>();
      dataSourceMock.refresh.and.returnValue(longRefresh$);

      workspaceEvents$.next(event(PLANNING_AREA_CREATED_EVENT));
      workspaceEvents$.next(event(PLANNING_AREA_CREATED_EVENT));

      expect(dataSourceMock.refresh.calls.count()).toBe(1);

      longRefresh$.complete();
      workspaceEvents$.next(event(PLANNING_AREA_CREATED_EVENT));

      expect(dataSourceMock.refresh.calls.count()).toBe(2);
    });

    it('keeps listening after a refresh fails', () => {
      dataSourceMock.refresh.and.returnValue(
        throwError(() => new Error('nope'))
      );
      workspaceEvents$.next(event(PLANNING_AREA_CREATED_EVENT));

      dataSourceMock.refresh.and.returnValue(of({ count: 0, results: [] }));
      workspaceEvents$.next(event(PLANNING_AREA_CREATED_EVENT));

      expect(dataSourceMock.refresh.calls.count()).toBe(2);
    });

    it('stops listening when the component is destroyed', () => {
      fixture.destroy();

      workspaceEvents$.next(event(PLANNING_AREA_CREATED_EVENT));

      expect(dataSourceMock.refresh).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('delegates search to the data source', () => {
      component.search('forest');

      expect(dataSourceMock.search).toHaveBeenCalledWith('forest');
    });
  });

  describe('changeSort', () => {
    it('changes sort direction from desc to asc', () => {
      component.sortDirection = 'desc';

      component.changeSort();

      expect(component.sortDirection).toBe('asc');
      expect(dataSourceMock.changeSort).toHaveBeenCalledWith({
        active: 'created_at',
        direction: 'asc',
      });
    });

    it('changes sort direction from asc to desc', () => {
      component.sortDirection = 'asc';

      component.changeSort();

      expect(component.sortDirection).toBe('desc');
      expect(dataSourceMock.changeSort).toHaveBeenCalledWith({
        active: 'created_at',
        direction: 'desc',
      });
    });
  });

  describe('pagination', () => {
    it('navigates to the requested page', () => {
      component.goToPage(4);

      expect(dataSourceMock.goToPage).toHaveBeenCalledWith(4);
    });

    it('changes page size', () => {
      component.changePageSize(25);

      expect(dataSourceMock.changePageSize).toHaveBeenCalledWith(25);
    });
  });

  describe('onMapError', () => {
    it('shows map error for a 500 error', () => {
      component.onMapError({
        error: {
          status: 500,
        },
      } as any);

      expect(newScenarioStateMock.showMapError).toHaveBeenCalled();
    });

    it('shows map error for a 599 error', () => {
      component.onMapError({
        error: {
          status: 599,
        },
      } as any);

      expect(newScenarioStateMock.showMapError).toHaveBeenCalled();
    });

    it('does not show map error for a 400 error', () => {
      component.onMapError({
        error: {
          status: 400,
        },
      } as any);

      expect(newScenarioStateMock.showMapError).not.toHaveBeenCalled();
    });

    it('does not show map error when status is missing', () => {
      component.onMapError({
        error: {},
      } as any);

      expect(newScenarioStateMock.showMapError).not.toHaveBeenCalled();
    });
  });

  describe('drawPlanningArea', () => {
    it('navigates to the workspace map viewer', () => {
      const navigateSpy = spyOn(component.router, 'navigate');

      component.drawPlanningArea();

      expect(navigateSpy).toHaveBeenCalledWith(['/map-viewer/workspace', 1], {
        state: { drawPlanningArea: true },
      });
    });
  });

  describe('ngOnDestroy', () => {
    it('destroys the data source', () => {
      component.ngOnDestroy();

      expect(dataSourceMock.destroy).toHaveBeenCalled();
    });
  });

  describe('canAddPlanningArea$', () => {
    it('emits true when the workspace grants add_planningarea', (done) => {
      component.canAddPlanningArea$.subscribe((canAdd) => {
        expect(canAdd).toBeTrue();
        done();
      });
    });

    it('emits false when the workspace does not grant it', (done) => {
      currentWorkspace$.next(workspaceWith(['view_workspace']));

      component.canAddPlanningArea$.subscribe((canAdd) => {
        expect(canAdd).toBeFalse();
        done();
      });
    });
  });
});
