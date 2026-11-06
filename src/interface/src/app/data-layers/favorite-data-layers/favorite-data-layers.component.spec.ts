import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject, map, of } from 'rxjs';
import { DataLayer, Resource } from '@types';
import { DataLayersService } from '@services/data-layers.service';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { DataLayerTooltipComponent } from '@data-layers/data-layer-tooltip/data-layer-tooltip.component';
import { SHOW_FAVORITE_STAR } from '@data-layers/favorite-star/favorite-star.token';
import { FavoriteDataLayersComponent } from './favorite-data-layers.component';

const layer = (id: number, name: string) => ({ id, name }) as DataLayer;

/** Stands in for the map viewer, which puts its map tabs under the search. */
@Component({
  standalone: true,
  imports: [FavoriteDataLayersComponent],
  template: `
    <app-favorite-data-layers
      [belowSearch]="mapTabs"></app-favorite-data-layers>
    <ng-template #mapTabs><nav class="map-tabs">Map 1</nav></ng-template>
  `,
})
class PanelHostComponent {}

describe('FavoriteDataLayersComponent', () => {
  let component: FavoriteDataLayersComponent;
  let fixture: ComponentFixture<FavoriteDataLayersComponent>;
  let favorites$: BehaviorSubject<Resource<DataLayer[]>>;
  let canEditFavorites$: BehaviorSubject<boolean>;
  let selectedDataLayers$: BehaviorSubject<DataLayer[]>;
  let unselectable: DataLayer | null;
  let handleLayerClick: jasmine.Spy;

  function create(displayAddButton = false) {
    fixture = TestBed.createComponent(FavoriteDataLayersComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('displayAddButton', displayAddButton);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function rowNames(el: HTMLElement) {
    return Array.from(el.querySelectorAll('.data-layer .layer-name')).map(
      (name) => name.textContent?.trim()
    );
  }

  beforeEach(async () => {
    favorites$ = new BehaviorSubject<Resource<DataLayer[]>>({
      isLoading: false,
      data: [],
    });
    canEditFavorites$ = new BehaviorSubject(true);
    selectedDataLayers$ = new BehaviorSubject<DataLayer[]>([]);
    unselectable = null;
    handleLayerClick = jasmine.createSpy('handleLayerClick');
    const changes$ = new BehaviorSubject<ReadonlyMap<number, boolean>>(
      new Map()
    );

    await TestBed.configureTestingModule({
      imports: [FavoriteDataLayersComponent, NoopAnimationsModule],
      providers: [
        MockProvider(DataLayersService),
        {
          provide: DataLayersStateService,
          useValue: {
            favorites$,
            loadingLayer$: of(false),
            viewedDataLayer$: of(null),
            selectDataLayer: jasmine.createSpy('selectDataLayer'),
            toggleFavorite: jasmine.createSpy('toggleFavorite'),
            favoritesEnabled: () => true,
            canEditFavorites$,
            selectedDataLayers$,
            getMaxSelectedLayers: () => 2,
            isSelectedLayer: (l: DataLayer) =>
              selectedDataLayers$.value.some((s) => s.id === l.id),
            isLayerUnselectable: (l: DataLayer) => unselectable?.id === l.id,
            getUnselectableLayer: (l: DataLayer) =>
              unselectable?.id === l.id
                ? { id: l.id, reason: 'PRIORITY_OBJECTIVE' as const }
                : undefined,
            handleLayerClick,
            isFavorite$: (l: DataLayer) =>
              changes$.pipe(map((c) => c.get(l.id) ?? true)),
          },
        },
      ],
    }).compileComponents();
  });

  it('lists the favorites of the workspace, without their category', () => {
    favorites$.next({
      isLoading: false,
      data: [layer(1, 'SNV Heavy Fuels'), layer(2, 'Carbon Storage')],
    });
    const el = create();

    expect(rowNames(el)).toEqual(['SNV Heavy Fuels', 'Carbon Storage']);
    expect(el.querySelector('app-data-set')).toBeNull();
  });

  it('filters the list by the search term', () => {
    favorites$.next({
      isLoading: false,
      data: [layer(1, 'SNV Heavy Fuels'), layer(2, 'Carbon Storage')],
    });
    const el = create();

    component.search('carbon');
    fixture.detectChanges();

    expect(rowNames(el)).toEqual(['Carbon Storage']);
  });

  it('shows a spinner while the favorites load', () => {
    favorites$.next({ isLoading: true });
    const el = create();

    expect(el.querySelector('mat-spinner')).not.toBeNull();
    expect(el.querySelector('sg-empty-state')).toBeNull();
  });

  it('keeps the rows while the list refreshes behind an event', () => {
    favorites$.next({ isLoading: true, data: [layer(1, 'SNV Heavy Fuels')] });
    const el = create();

    expect(rowNames(el)).toEqual(['SNV Heavy Fuels']);
    expect(el.querySelector('mat-spinner')).toBeNull();
  });

  it('says so when the favorites cannot be loaded', () => {
    favorites$.next({ isLoading: false, error: new Error('400') });
    const el = create();

    expect(el.textContent).toContain("We couldn't load your favorites");
    expect(el.querySelector('mat-spinner')).toBeNull();
  });

  it('invites the user to favorite layers when there are none', () => {
    const el = create();

    expect(el.textContent).toContain('No favorite data layers yet');
    expect(el.textContent).toContain('will help you define priority areas');
  });

  it('tells a viewer where the favorites would come from', () => {
    canEditFavorites$.next(false);

    const el = create();

    expect(el.textContent).toContain('No favorite data layers yet');
    expect(el.textContent).toContain(
      'Favorites added by owner and editors will appear here'
    );
    expect(el.textContent).not.toContain('will help you define priority areas');
  });

  it('offers the star that takes a layer out of the list', () => {
    favorites$.next({ isLoading: false, data: [layer(1, 'SNV Heavy Fuels')] });
    const el = create();

    expect(el.querySelector('app-favorite-star .favorite-star')).not.toBeNull();
  });

  // the scenario wizard asks for layers to be picked, not favorited, and this
  // panel is no exception to that
  it('leaves the star out where the surrounding flow does not offer it', () => {
    TestBed.overrideProvider(SHOW_FAVORITE_STAR, { useValue: false });
    favorites$.next({ isLoading: false, data: [layer(1, 'SNV Heavy Fuels')] });
    const el = create();

    expect(rowNames(el)).toEqual(['SNV Heavy Fuels']);
    expect(el.querySelector('app-favorite-star .favorite-star')).toBeNull();
  });

  it('offers the info of each favorite, kept out until it is asked for', () => {
    favorites$.next({
      isLoading: false,
      data: [layer(1, 'SNV Heavy Fuels'), layer(2, 'Carbon Storage')],
    });
    const el = create();

    expect(el.querySelectorAll('.info-icon').length).toBe(2);
    expect(
      fixture.debugElement.query(By.directive(DataLayerTooltipComponent))
    ).toBeNull();
  });

  it('shows the info of the layer whose button was pressed', () => {
    favorites$.next({
      isLoading: false,
      data: [layer(1, 'SNV Heavy Fuels'), layer(2, 'Carbon Storage')],
    });
    const el = create();

    el.querySelectorAll<HTMLElement>('.info-icon')[1].click();
    fixture.detectChanges();

    const tooltip = fixture.debugElement.query(
      By.directive(DataLayerTooltipComponent)
    );

    expect(tooltip).not.toBeNull();
    expect(tooltip.componentInstance.layer.id).toBe(2);
  });

  // the checkbox, the toggle and the info button are all different heights,
  // and a long name makes the row taller still
  it('keeps everything in a row on the same line', () => {
    favorites$.next({
      isLoading: false,
      data: [layer(1, 'Dry Standing Dead Tree Biomass, Above Ground')],
    });
    const el = create(true);
    const row = el.querySelector('.data-layer')!;

    const middleOf = (selector: string) => {
      const box = row.querySelector(selector)!.getBoundingClientRect();
      return box.top + box.height / 2;
    };
    const checkbox = middleOf('mat-checkbox');

    expect(Math.abs(middleOf('.sg-toggle__track') - checkbox)).toBeLessThan(
      1.5
    );
    expect(Math.abs(middleOf('.info-icon') - checkbox)).toBeLessThan(1.5);
  });

  it('says there are no results when the search matches nothing', () => {
    favorites$.next({ isLoading: false, data: [layer(1, 'SNV Heavy Fuels')] });
    const el = create();

    component.search('nothing like this');
    fixture.detectChanges();

    expect(el.querySelector('sg-no-results')).not.toBeNull();
  });

  // the favorites of a workspace are meant to be reached for while a
  // scenario is being configured, so this panel picks layers the same way
  // the browse list does
  describe('where the step picks layers', () => {
    const twoLayers = () =>
      favorites$.next({
        isLoading: false,
        data: [layer(1, 'SNV Heavy Fuels'), layer(2, 'Carbon Storage')],
      });

    const checkboxes = (el: HTMLElement) =>
      Array.from(el.querySelectorAll<HTMLInputElement>('.button-column input'));

    it('leaves the column out where it does not', () => {
      twoLayers();
      const el = create();

      expect(el.querySelector('.button-column')).toBeNull();
      expect(el.querySelector('.nodes-header')).toBeNull();
      expect(el.querySelector('.data-layer')?.className).not.toContain(
        'with-add-button'
      );
    });

    it('spaces the rows like the header above them', () => {
      twoLayers();
      const el = create(true);

      expect(el.querySelector('.data-layer')?.className).toContain(
        'with-add-button'
      );
    });

    it('offers a checkbox per favorite, under a header', () => {
      twoLayers();
      const el = create(true);

      expect(checkboxes(el).length).toBe(2);
      expect(el.querySelector('.nodes-header')?.textContent).toContain(
        'Select'
      );
    });

    it('picks the layer the checkbox belongs to', () => {
      twoLayers();
      const el = create(true);

      el.querySelectorAll<HTMLElement>(
        '.button-column mat-checkbox'
      )[1].click();

      expect(handleLayerClick).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ id: 2 })
      );
    });

    it('shows a layer already picked as checked', () => {
      twoLayers();
      selectedDataLayers$.next([layer(2, 'Carbon Storage')]);
      const el = create(true);

      expect(checkboxes(el).map((box) => box.checked)).toEqual([false, true]);
    });

    it('blocks a layer the step cannot take', () => {
      twoLayers();
      unselectable = layer(1, 'SNV Heavy Fuels');
      const el = create(true);

      expect(checkboxes(el).map((box) => box.disabled)).toEqual([true, false]);
    });

    it('blocks what is left once the maximum is picked', () => {
      twoLayers();
      selectedDataLayers$.next([
        layer(2, 'Carbon Storage'),
        layer(3, 'Something else'),
      ]);
      const el = create(true);

      expect(checkboxes(el).map((box) => box.disabled)).toEqual([true, false]);
    });

    it('keeps the header out while there is nothing favorited', () => {
      const el = create(true);

      expect(el.querySelector('.nodes-header')).toBeNull();
    });
  });

  describe('in a map viewer with more than one map', () => {
    function createInHost() {
      const host = TestBed.createComponent(PanelHostComponent);
      host.detectChanges();
      return host.nativeElement as HTMLElement;
    }

    it('shows the map tabs between the search bar and the list', () => {
      const el = createInHost();
      const panel = el.querySelector('app-favorite-data-layers')!;

      expect(
        Array.from(panel.children).map((child) =>
          child.className.replace(' ng-star-inserted', '')
        )
      ).toEqual(['side-search-container no-border', 'map-tabs', 'scrollable']);
    });

    it('lets the tabs carry the line under the search bar', () => {
      const el = createInHost();

      expect(el.querySelector('.side-search-container')?.classList).toContain(
        'no-border'
      );
    });

    it('keeps the line when there are no tabs to show', () => {
      const el = create();

      expect(
        el.querySelector('.side-search-container')?.classList
      ).not.toContain('no-border');
    });
  });
});
