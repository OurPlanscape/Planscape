import { TestBed } from '@angular/core/testing';

import { MapModuleService } from './map-module.service';
import { MockProvider } from 'ng-mocks';
import { ModuleService } from './module.service';
import { MapDataDataSet } from '@app/types/module.types';
import { ApiModule, MapData } from '@types';
import { of } from 'rxjs';

function makeDataSet(id: number, name: string): MapDataDataSet {
  return {
    id,
    name,
    organization: { id: 1, name: 'Org' },
    preferred_display_type: 'MAIN_DATALAYERS',
    selection_type: 'SINGLE',
  };
}

describe('MapModuleService', () => {
  let service: MapModuleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockProvider(ModuleService)],
    });
    service = TestBed.inject(MapModuleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

describe('MapModuleService datasets$ sorting', () => {
  function setup(
    mainDatasets: MapDataDataSet[],
    baseDatasets: MapDataDataSet[]
  ) {
    const mapData: MapData = {
      datasets: { main_datasets: mainDatasets, base_datasets: baseDatasets },
    };
    const apiModule: ApiModule<MapData> = { name: 'test', options: mapData };
    TestBed.configureTestingModule({
      providers: [
        MockProvider(ModuleService, {
          getModule: (() => of(apiModule)) as ModuleService['getModule'],
        }),
      ],
    });
    const svc = TestBed.inject(MapModuleService);
    svc.loadMapModule().subscribe();
    return svc;
  }

  it('should sort main_datasets alphabetically by name', (done) => {
    const svc = setup(
      [
        makeDataSet(3, 'Zebra'),
        makeDataSet(1, 'Alpha'),
        makeDataSet(2, 'Mango'),
      ],
      []
    );

    svc.datasets$.subscribe(({ main_datasets }) => {
      expect(main_datasets.map((d) => d.name)).toEqual([
        'Alpha',
        'Mango',
        'Zebra',
      ]);
      done();
    });
  });

  it('should sort base_datasets alphabetically by name', (done) => {
    const svc = setup(
      [],
      [
        makeDataSet(3, 'Zebra'),
        makeDataSet(1, 'Alpha'),
        makeDataSet(2, 'Mango'),
      ]
    );

    svc.datasets$.subscribe(({ base_datasets }) => {
      expect(base_datasets.map((d) => d.name)).toEqual([
        'Alpha',
        'Mango',
        'Zebra',
      ]);
      done();
    });
  });

  it('should not mutate the original arrays', (done) => {
    const originalMain = [
      makeDataSet(3, 'Zebra'),
      makeDataSet(1, 'Alpha'),
      makeDataSet(2, 'Mango'),
    ];
    const originalBase = [
      makeDataSet(6, 'Z'),
      makeDataSet(4, 'A'),
      makeDataSet(5, 'M'),
    ];

    const svc = setup(originalMain, originalBase);

    svc.datasets$.subscribe(() => {
      expect(originalMain.map((d) => d.name)).toEqual([
        'Zebra',
        'Alpha',
        'Mango',
      ]);
      expect(originalBase.map((d) => d.name)).toEqual(['Z', 'A', 'M']);
      done();
    });
  });
});
