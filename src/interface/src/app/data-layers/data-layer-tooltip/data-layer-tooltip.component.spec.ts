import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataLayerTooltipComponent } from './data-layer-tooltip.component';
import { DataLayersStateService } from '../data-layers.state.service';
import { DataLayersService } from '@services/data-layers.service';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { DataLayer } from '@types';
import { overrideFeatureFlags } from '@features/testing';

describe('DataLayerTooltipComponent', () => {
  let component: DataLayerTooltipComponent;
  let fixture: ComponentFixture<DataLayerTooltipComponent>;

  const fullLayer = {
    id: 1,
    name: 'SNV Heavy Fuels',
    dataset: { id: 2, name: 'California Landscape Metrics' },
    organization: { id: 3, name: 'CA Wildfire & Forest Resilience Task Force' },
    info: { stats: [{ min: 0, max: 71 }] },
    metadata: {
      metadata: {
        identification: {
          description: 'A description of the layer',
          geographicCoverage: 'Kern County, CA',
          keywords: {
            units: { keywords: ['short tons biomass/acre'] },
          },
        },
        distribution: {
          download: { url: 'https://example.test/source', name: 'Source' },
        },
      },
    },
  } as unknown as DataLayer;

  /** Creates the component with the given layer, after the flags are set. */
  function create(layer: Partial<DataLayer> = fullLayer, searchText = '') {
    fixture = TestBed.createComponent(DataLayerTooltipComponent);
    component = fixture.componentInstance;
    component.layer = layer as DataLayer;
    component.searchText = searchText;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataLayerTooltipComponent],
      providers: [
        MockProvider(DataLayersStateService, {
          dataTree$: of(null),
          paths$: of([]),
        }),
        MockProvider(DataLayersService, {
          getPublicUrl: () => of(''),
        }),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    overrideFeatureFlags();
    create({ name: 'Testing Name' });

    expect(component).toBeTruthy();
  });

  describe('with DATA_ORGANIZATION off', () => {
    beforeEach(() => overrideFeatureFlags());

    it('keeps the previous card', () => {
      const el = create();

      expect(el.textContent).toContain('Source');
      expect(el.textContent).not.toContain('Dataset Name');
      expect(el.textContent).not.toContain('Learn More');
    });
  });

  describe('with DATA_ORGANIZATION on', () => {
    beforeEach(() => overrideFeatureFlags('DATA_ORGANIZATION'));

    it('shows the metadata fields', () => {
      const el = create();
      const text = el.textContent ?? '';

      expect(text).toContain('California Landscape Metrics');
      expect(text).toContain('CA Wildfire & Forest Resilience Task Force');
      expect(text).toContain('0-71');
      expect(text).toContain('short tons biomass/acre');
      expect(text).toContain('Kern County, CA');
      expect(text).toContain('A description of the layer');
    });

    it('shows a dash for every field the layer does not carry', () => {
      const el = create({ id: 9, name: 'Bare' } as unknown as DataLayer);
      const values = Array.from(el.querySelectorAll('dd')).map((dd) =>
        dd.textContent?.trim()
      );
      const [datasetName, dataCreator, coverage, valueRange, units, vintage] =
        values;

      expect([datasetName, dataCreator, valueRange, units, vintage]).toEqual([
        '--',
        '--',
        '--',
        '--',
        '--',
      ]);
      // placeholder until the API sends geographic coverage
      expect(coverage).toBe('Insert location');
    });

    it('links Learn More to the source url', () => {
      const el = create();
      const link = el.querySelector('.learn-more-link') as HTMLAnchorElement;

      expect(link.getAttribute('href')).toBe('https://example.test/source');
      expect(link.getAttribute('target')).toBe('_blank');
    });

    it('hides Learn More when there is no source', () => {
      const el = create({ id: 9, name: 'Bare' } as unknown as DataLayer);

      expect(el.querySelector('.learn-more-link')).toBeNull();
    });

    it('shows the description expanded, and hides it when collapsed', () => {
      const el = create();
      const toggle = el.querySelector('.layer-name-toggle') as HTMLElement;

      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(el.querySelector('.description')).not.toBeNull();

      toggle.click();
      fixture.detectChanges();

      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(el.querySelector('.description')).toBeNull();

      toggle.click();
      fixture.detectChanges();

      expect(el.querySelector('.description')).not.toBeNull();
    });

    it('highlights the search text on the text fields', () => {
      const el = create(fullLayer, 'landscape');
      const marks = Array.from(el.querySelectorAll('mark')).map(
        (m) => m.textContent
      );

      expect(marks).toContain('Landscape');
    });

    it('does not highlight anything without a search text', () => {
      const el = create(fullLayer);

      expect(el.querySelectorAll('mark').length).toBe(0);
    });
  });
});
