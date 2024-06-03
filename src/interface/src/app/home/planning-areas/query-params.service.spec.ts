import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import {
  DEFAULT_SORT_OPTIONS,
  QueryParamsService,
} from './query-params.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Sort } from '@angular/material/sort';

describe('QueryParamsService', () => {
  let service: QueryParamsService;
  let route: ActivatedRoute;
  let router: Router;
  let location: Location;

  const defaultSort: Sort = { active: 'name', direction: 'asc' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        QueryParamsService,
        { provide: DEFAULT_SORT_OPTIONS, useValue: defaultSort },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParams: {},
            },
          },
        },
      ],
    });

    service = TestBed.inject(QueryParamsService);
    route = TestBed.inject(ActivatedRoute);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  describe('getInitialSortParams', () => {
    it('should return sort params from URL if they exist', () => {
      route.snapshot.queryParams = { active: 'date', direction: 'desc' };

      const sortParams = service.getInitialSortParams();

      expect(sortParams).toEqual({ active: 'date', direction: 'desc' });
    });

    it('should return default sort params if URL params do not exist', () => {
      route.snapshot.queryParams = {};

      const sortParams = service.getInitialSortParams();

      expect(sortParams).toEqual(defaultSort);
    });
  });

  describe('changeSort', () => {
    it('should update the URL without reloading the page or triggering navigation events', () => {
      spyOn(router, 'createUrlTree').and.callThrough();
      spyOn(location, 'go').and.callThrough();

      const routerEventsSpy = spyOn(
        router.events,
        'subscribe'
      ).and.callThrough();

      const sortOptions: Sort = { active: 'date', direction: 'asc' };
      service.changeSort(sortOptions);

      expect(router.createUrlTree).toHaveBeenCalledWith([], {
        relativeTo: route,
        queryParams: sortOptions,
        queryParamsHandling: 'merge',
      });

      const urlTree = router
        .createUrlTree([], {
          relativeTo: route,
          queryParams: sortOptions,
          queryParamsHandling: 'merge',
        })
        .toString();

      expect(location.go).toHaveBeenCalledWith(urlTree);
      expect(routerEventsSpy).not.toHaveBeenCalled();
    });
  });
});
