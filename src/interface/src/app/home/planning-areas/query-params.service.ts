import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Sort } from '@angular/material/sort';
import { Inject, Injectable, InjectionToken } from '@angular/core';

// Injection token used as default sorting options for this service
export const DEFAULT_SORT_OPTIONS = new InjectionToken<Sort>(
  'DEFAULT_SORT_OPTIONS'
);

@Injectable()
export class QueryParamsService {
  private readonly limit = 13;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    @Inject(DEFAULT_SORT_OPTIONS) private defaultSort: Sort
  ) {}

  /**
   * this method changes the URL *without* reloading the page.
   * It updates the query parameters and merges them with existing parameters.
   * Note that this action does not trigger route navigation or component reinitialization.
   */
  changeSort(sortOptions: Sort) {
    const currentUrl = this.router
      .createUrlTree([], {
        relativeTo: this.route,
        queryParams: sortOptions,
        queryParamsHandling: 'merge', // Merge with existing query parameters
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

  /**
   * TODO handle pagination.
   */
  getInitialPageParams(): { limit: number; offset: number } {
    const { limit, offset } = this.route.snapshot.queryParams;
    return {
      limit: limit || this.limit,
      offset: offset || 0,
    };
  }
}
