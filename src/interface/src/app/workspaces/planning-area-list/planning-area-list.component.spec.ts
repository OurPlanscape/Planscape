import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanningAreaListComponent } from './planning-area-list.component';
import { PlanningAreasDataSource } from '@app/standalone/planning-areas/planning-areas.datasource';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';
import { AuthService } from '@app/services';
import { BehaviorSubject, of } from 'rxjs';
import { MockProviders } from 'ng-mocks';
import { MapService } from '@maplibre/ngx-maplibre-gl';
import { Router } from '@angular/router';

describe('PlanningAreaListComponent', () => {
  let component: PlanningAreaListComponent;
  let fixture: ComponentFixture<PlanningAreaListComponent>;

  let dataSourceMock: jasmine.SpyObj<PlanningAreasDataSource>;
  let mapConfigStateMock: jasmine.SpyObj<MapConfigState>;
  let newScenarioStateMock: jasmine.SpyObj<NewScenarioState>;
  let authServiceMock: jasmine.SpyObj<AuthService>;

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

  describe('ngOnDestroy', () => {
    it('destroys the data source', () => {
      component.ngOnDestroy();

      expect(dataSourceMock.destroy).toHaveBeenCalled();
    });
  });
});
