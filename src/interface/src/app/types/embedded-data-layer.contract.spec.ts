import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { EmbeddedDataLayer, ScenarioGoal, UsageType } from '@types';

import { TreatmentGoalDetailsComponent } from '../scenario-creation/treatment-goal-details/treatment-goal-details.component';

const PAYLOAD: unknown = [
  {
    usage_type: 'PRIORITY',
    datalayer: {
      id: 1342,
      name: 'Probability of Fire Severity - High',
      dataset: {
        id: 12,
        organization: 3,
        name: 'California Landscape Metrics',
        description: 'Metrics describing California landscapes.',
      },
      category: {
        id: 88,
        order: 2,
        name: 'Fire Dynamics',
        parent: null,
        depth: 1,
      },
      type: 'RASTER',
      styles: [
        {
          id: 0,
          data: {
            map_type: 'RAMP',
            no_data: { values: ['nan'], color: null, opacity: 0, label: '' },
            entries: [
              { value: 0, color: '#7a0403', opacity: 1, label: '0' },
              { value: 0.17, color: '#d93807', opacity: 1, label: '0.17' },
              { value: 0.33, color: '#fe992c', opacity: 1, label: '0.33' },
            ],
          },
        },
      ],
      info: {
        blockxsize: 512,
        blockysize: 512,
        nodata: -9999,
        stats: [{ min: 0, max: 1, mean: 0.4, std: 0.2 }],
      },
      metadata: {
        metadata: {
          identification: {
            keywords: { units: { keywords: ['Probability'] } },
          },
        },
      },
    },
  },
];

const EMBED_KEYS = [
  'category',
  'dataset',
  'id',
  'info',
  'metadata',
  'name',
  'styles',
  'type',
];

const NOT_SENT = [
  'created_at',
  'created_by',
  'geometry_type',
  'map_service_type',
  'map_url',
  'organization',
  'path',
  'public_url',
  'simple_categories',
  'status',
  'storage_type',
  'url',
];

function firstLayer(): Record<string, unknown> {
  const usages = PAYLOAD as { datalayer: Record<string, unknown> }[];
  return usages[0].datalayer;
}

describe('the datalayer embedded in usage_types', () => {
  it('carries exactly the keys the backend pins', () => {
    expect(Object.keys(firstLayer()).sort()).toEqual(EMBED_KEYS);
  });

  it('leaves out the fields the list endpoint stopped sending', () => {
    const keys = Object.keys(firstLayer());

    NOT_SENT.forEach((field) => expect(keys).not.toContain(field));
  });

  it('nests the dataset instead of sending its id alone', () => {
    const dataset = firstLayer()['dataset'];

    expect(typeof dataset).toBe('object');
    expect((dataset as { name: unknown }).name).toEqual(jasmine.any(String));
  });

  it('describes the layer colours the map paints with', () => {
    const styles = firstLayer()['styles'] as { data: Record<string, any> }[];

    expect(styles.length).toBeGreaterThan(0);
    expect(styles[0].data['map_type']).toEqual(jasmine.any(String));
    expect(styles[0].data['entries'].length).toBeGreaterThan(0);
  });

  it('carries the block size the map sizes its tiles from', () => {
    const info = firstLayer()['info'] as Record<string, unknown>;

    expect(info['blockxsize']).toEqual(jasmine.any(Number));
  });

  it('carries the units the legend titles itself with', () => {
    const metadata = firstLayer()['metadata'] as any;

    expect(metadata.metadata.identification.keywords.units.keywords).toEqual(
      jasmine.any(Array)
    );
  });

  it('satisfies EmbeddedDataLayer without widening it', () => {
    const layer = firstLayer() as unknown as EmbeddedDataLayer;

    expect(layer.id).toEqual(jasmine.any(Number));
    expect(layer.name).toEqual(jasmine.any(String));
    expect(layer.dataset.name).toEqual(jasmine.any(String));
  });
});

describe('the details panel reading that payload', () => {
  let fixture: ComponentFixture<TreatmentGoalDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentGoalDetailsComponent],
      providers: [
        MockProvider(DataLayersStateService, { viewedDataLayer$: of(null) }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentGoalDetailsComponent);
    fixture.componentInstance.goal = {
      id: 1,
      name: 'Prioritize Areas w/ High Wildfire Hazard Potential',
      description: '',
      priorities: [],
      category: 'Fire Dynamics',
      group: '',
      group_text: '',
      usage_types: PAYLOAD as UsageType[],
    } as ScenarioGoal;
    fixture.detectChanges();
  });

  it('names the layer', () => {
    expect(
      fixture.debugElement.query(By.css('.layer-name')).nativeElement
        .textContent
    ).toContain('Probability of Fire Severity - High');
  });

  it('names the dataset underneath it', () => {
    expect(
      fixture.debugElement.query(By.css('.layer-source')).nativeElement
        .textContent
    ).toContain('California Landscape Metrics');
  });
});
