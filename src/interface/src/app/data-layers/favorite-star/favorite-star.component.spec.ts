import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatTooltip } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
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
  let canEditFavorites$: BehaviorSubject<boolean>;
  let toggleFavorite: jasmine.Spy;

  function create() {
    fixture = TestBed.createComponent(FavoriteStarComponent);
    fixture.componentInstance.layer = layer;
    fixture.detectChanges();
    return fixture.debugElement.query(By.css('.favorite-star'));
  }

  function tooltip() {
    return fixture.debugElement
      .query(By.directive(MatTooltip))
      .injector.get(MatTooltip);
  }

  beforeEach(async () => {
    favorites = new Set<number>();
    enabled = true;
    changes$ = new BehaviorSubject<ReadonlyMap<number, boolean>>(new Map());
    canEditFavorites$ = new BehaviorSubject(true);
    toggleFavorite = jasmine.createSpy('toggleFavorite');

    await TestBed.configureTestingModule({
      imports: [FavoriteStarComponent, RowHostComponent, NoopAnimationsModule],
      providers: [
        {
          provide: DataLayersStateService,
          useValue: {
            toggleFavorite,
            canEditFavorites$,
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

  describe('for a member who cannot change the favorites', () => {
    beforeEach(() => canEditFavorites$.next(false));

    it('still shows the favorite state', () => {
      favorites.add(layer.id);
      const star = create();

      expect(star).not.toBeNull();
      expect(star.nativeElement.classList).toContain('favorited');
    });

    it('leaves the star inert', () => {
      const star = create();

      expect(star.nativeElement.disabled).toBe(true);

      star.nativeElement.click();

      expect(toggleFavorite).not.toHaveBeenCalled();
    });

    it('explains why the star does nothing', () => {
      create();

      expect(tooltip().message).toBe(
        "You don't have permission to modify favorites"
      );
    });

    it('keeps saying so for a layer that is already a favorite', () => {
      favorites.add(layer.id);
      create();

      expect(tooltip().message).toBe(
        "You don't have permission to modify favorites"
      );
    });

    it('does not turn the layer on the map when the star is clicked', () => {
      const host = TestBed.createComponent(RowHostComponent);
      host.detectChanges();

      host.debugElement
        .query(By.css('.favorite-star-slot'))
        .nativeElement.click();
      host.detectChanges();

      expect(host.componentInstance.viewed).toBe(false);
    });
  });

  it('offers to favorite a layer that is not one yet', () => {
    create();

    expect(tooltip().message).toBe('Add to favorites');
  });

  it('offers to take a favorite layer out', () => {
    favorites.add(layer.id);
    create();

    expect(tooltip().message).toBe('Remove from favorites');
  });

  it('follows the state of the layer', () => {
    create();

    changes$.next(new Map([[layer.id, true]]));
    fixture.detectChanges();

    expect(tooltip().message).toBe('Remove from favorites');
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
