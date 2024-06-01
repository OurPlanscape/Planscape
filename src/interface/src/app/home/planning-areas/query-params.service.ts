import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { SortDirection } from '@angular/material/sort';
import { Injectable } from '@angular/core';

@Injectable()
export class QueryParamsService {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {}

  /**
   * this method changes the URL *without* reloading the page.
   * It updates the query parameters and merges them with existing parameters.
   * Note that this action does not trigger route navigation or component reinitialization.
   */
  changeSort(e: { active: string; direction: SortDirection }) {
    const currentUrl = this.router
      .createUrlTree([], {
        relativeTo: this.route,
        queryParams: e,
        queryParamsHandling: 'merge', // Merge with existing query parameters
      })
      .toString();

    this.location.go(currentUrl);
  }

  getInitialSortParams(): {
    active: string;
    direction: SortDirection;
  } {
    const { active, direction } = this.route.snapshot.queryParams;
    return {
      active: active || 'name',
      direction: direction || 'asc',
    };
  }

  getInitialPageParams() {
    // TODO pagination
  }
}
