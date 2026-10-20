import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, map } from 'rxjs';
import { DataLayer } from '@types';
import { ToggleComponent } from '@styleguide';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { FavoriteStarComponent } from './favorite-star.component';

const layer = { id: 5, name: 'SNV Heavy Fuels' } as DataLayer;

/**
 * The star sits inside the toggle's label, where the design puts it. A button
 * inside a label must not activate the label, or favoriting would also turn the
 * layer on the map.
 */
@Component({
  standalone: true,
  imports: [FavoriteStarComponent, ToggleComponent],
  template: `
    <sg-toggle (change)="viewed = !viewed">
      <app-favorite-star [layer]="layer"></app-favorite-star>
      {{ layer.name }}
    </sg-toggle>
  `,
})
class RowHostComponent {
  layer = layer;
  viewed = false;
}

describe('FavoriteStarComponent', () => {
  let fixture: ComponentFixture<FavoriteStarComponent>;
  let favorites: Set<number>;
  let changes$: BehaviorSubject<ReadonlyMap<number, boolean>>;
  let enabled: boolean;
  let toggleFavorite: jasmine.Spy;

  function create() {
    fixture = TestBed.createComponent(FavoriteStarComponent);
    fixture.componentInstance.layer = layer;
    fixture.detectChanges();
    return fixture.debugElement.query(By.css('.favorite-star'));
  }

  beforeEach(async () => {
    favorites = new Set<number>();
    enabled = true;
    changes$ = new BehaviorSubject<ReadonlyMap<number, boolean>>(new Map());
    toggleFavorite = jasmine.createSpy('toggleFavorite');

    await TestBed.configureTestingModule({
      imports: [FavoriteStarComponent, RowHostComponent],
      providers: [
        {
          provide: DataLayersStateService,
          useValue: {
            toggleFavorite,
            favoritesEnabled: () => enabled,
            isFavorite$: (l: DataLayer) =>
              changes$.pipe(map((c) => c.get(l.id) ?? favorites.has(l.id))),
          },
        },
      ],
    }).compileComponents();
  });

  it('shows an empty star for a layer that is not a favorite', () => {
    const star = create();

    expect(star).not.toBeNull();
    expect(star.nativeElement.classList).not.toContain('favorited');
  });

  it('shows the filled star for a favorite layer', () => {
    favorites.add(layer.id);
    const star = create();

    expect(star.nativeElement.classList).toContain('favorited');
  });

  it('favorites the layer when clicked', () => {
    const star = create();

    star.nativeElement.click();

    expect(toggleFavorite).toHaveBeenCalledWith(layer);
  });

  it('follows the state when the layer stops being a favorite elsewhere', () => {
    favorites.add(layer.id);
    const star = create();

    changes$.next(new Map([[layer.id, false]]));
    fixture.detectChanges();

    expect(star.nativeElement.classList).not.toContain('favorited');
  });

  it('is not rendered where favoriting does not apply', () => {
    enabled = false;

    expect(create()).toBeNull();
  });

  it('does not turn the layer on the map when the star is clicked', () => {
    const host = TestBed.createComponent(RowHostComponent);
    host.detectChanges();

    host.debugElement.query(By.css('.favorite-star')).nativeElement.click();
    host.detectChanges();

    const checkbox = host.debugElement.query(By.css('input[type="checkbox"]'))
      .nativeElement as HTMLInputElement;

    expect(toggleFavorite).toHaveBeenCalledWith(layer);
    expect(host.componentInstance.viewed).toBe(false);
    expect(checkbox.checked).toBe(false);
  });
});
