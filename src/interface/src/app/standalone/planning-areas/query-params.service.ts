import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Sort } from '@angular/material/sort';
import { Inject, Injectable, InjectionToken } from '@angular/core';
import { RegionsWithString } from '@types';
import { filter } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { LocalStorageService } from '@services/local-storage.service';

// Injection token used as default sorting options for this service
export const DEFAULT_SORT_OPTIONS = new InjectionToken<Sort>(
  'DEFAULT_SORT_OPTIONS'
);

export interface QueryParams extends Partial<Sort> {
  page?: number;
  name?: string;
  limit?: number;
  region?: string;
  creators?: string;
}

@UntilDestroy()
@Injectable()
export class QueryParamsService {
  readonly defaultLimit = 10;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private localStorageService: LocalStorageService,
    @Inject(DEFAULT_SORT_OPTIONS) private defaultSort: Sort
  ) {
    router.events
      .pipe(
        untilDestroyed(this),
        filter((event) => event instanceof NavigationStart)
      )
      .subscribe((s) => {
        const currentParams = this.getCurrentParams();
        this.localStorageService.setItem('homeParameters', currentParams);
      });
  }

  /**
   * this method changes the URL *without* reloading the page.
   * It updates the query parameters and merges them with existing parameters.
   * Note that this action does not trigger route navigation or component reinitialization.
   */
  updateUrl(options: QueryParams) {
    // Parse the current path parameters
    const currentParams = this.getCurrentParams();
    const currentUrl = this.router
      .createUrlTree([], {
        relativeTo: this.route,
        queryParams: { ...currentParams, ...options },
      })
      .toString();

    this.location.go(currentUrl);
  }

  getInitialSortParams(): Sort {
    const { active, direction } = this.route.snapshot.queryParams;
    return {
      active: active || this.defaultSort.active,
      direction: direction || this.defaultSort.direction,
    };
  }

  getInitialPageParams(): { page: number; limit: number } {
    const { page, limit } = this.route.snapshot.queryParams;
    return {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : this.defaultLimit,
    };
  }

  getInitialFilterParam(): string {
    const { name } = this.route.snapshot.queryParams;
    return name || '';
  }

  getInitialRegionParam(): { name: string; value: string }[] {
    const { region } = this.route.snapshot.queryParams;
    if (region) {
      const regionKeys = region.split(',');
      return regionKeys.map((r: string) =>
        RegionsWithString.find((d) => d.value === r)
      );
    }
    return [];
  }

  getInitialCreatorsIdParam(): number[] {
    const { creators } = this.route.snapshot.queryParams;
    if (creators) {
      return creators.split(',').map((id: string) => parseInt(id, 10));
    }
    return [];
  }

  private getCurrentParams() {
    const urlTree = this.router.parseUrl(this.location.path());
    return urlTree.queryParams;
  }
}
