import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Sort } from '@angular/material/sort';
import { Inject, Injectable, InjectionToken } from '@angular/core';

// Injection token used as default sorting options for this service
export const DEFAULT_SORT_OPTIONS = new InjectionToken<Sort>(
  'DEFAULT_SORT_OPTIONS'
);

export interface QueryParams extends Sort {
  offset?: number;
}

@Injectable()
export class QueryParamsService {
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
  updateUrl(options: QueryParams) {
    const currentUrl = this.router
      .createUrlTree([], {
        relativeTo: this.route,
        queryParams: options,
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

  getInitialPageParams(): { offset: number } {
    const { offset } = this.route.snapshot.queryParams;
    return {
      offset: offset || 0,
    };
  }
}