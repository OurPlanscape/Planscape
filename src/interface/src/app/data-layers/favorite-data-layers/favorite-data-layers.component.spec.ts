import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, map, of } from 'rxjs';
import { DataLayer, Resource } from '@types';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { FavoriteDataLayersComponent } from './favorite-data-layers.component';

const layer = (id: number, name: string) => ({ id, name }) as DataLayer;

describe('FavoriteDataLayersComponent', () => {
  let component: FavoriteDataLayersComponent;
  let fixture: ComponentFixture<FavoriteDataLayersComponent>;
  let favorites$: BehaviorSubject<Resource<DataLayer[]>>;

  function create() {
    fixture = TestBed.createComponent(FavoriteDataLayersComponent);
    component = fixture.componentInstance;
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
    const changes$ = new BehaviorSubject<ReadonlyMap<number, boolean>>(
      new Map()
    );

    await TestBed.configureTestingModule({
      imports: [FavoriteDataLayersComponent],
      providers: [
        {
          provide: DataLayersStateService,
          useValue: {
            favorites$,
            loadingLayer$: of(false),
            viewedDataLayer$: of(null),
            selectDataLayer: jasmine.createSpy('selectDataLayer'),
            toggleFavorite: jasmine.createSpy('toggleFavorite'),
            favoritesEnabled: () => true,
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

  it('says so when the favorites cannot be loaded', () => {
    favorites$.next({ isLoading: false, error: new Error('400') });
    const el = create();

    expect(el.textContent).toContain("We couldn't load your favorites");
    expect(el.querySelector('mat-spinner')).toBeNull();
  });

  it('invites the user to favorite layers when there are none', () => {
    const el = create();

    expect(el.textContent).toContain('No favorite data layers yet');
  });

  it('says there are no results when the search matches nothing', () => {
    favorites$.next({ isLoading: false, data: [layer(1, 'SNV Heavy Fuels')] });
    const el = create();

    component.search('nothing like this');
    fixture.detectChanges();

    expect(el.querySelector('sg-no-results')).not.toBeNull();
  });
});
