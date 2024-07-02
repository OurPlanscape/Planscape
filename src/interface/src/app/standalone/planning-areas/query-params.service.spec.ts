import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import {
  DEFAULT_SORT_OPTIONS,
  QueryParamsService,
} from './query-params.service';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
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

  describe('updateUrl', () => {
    it('should update the URL without reloading the page or triggering navigation events', () => {
      const createUrlTreeSpy = spyOn(router, 'createUrlTree').and.callThrough();
      const locationGoSpy = spyOn(location, 'go').and.callThrough();

      const routerEventsSpy = spyOn(
        router.events,
        'subscribe'
      ).and.callThrough();

      const sortOptions: Sort = { active: 'date', direction: 'asc' };
      service.updateUrl(sortOptions);

      expect(createUrlTreeSpy).toHaveBeenCalledWith([], {
        relativeTo: route,
        queryParams: sortOptions,
      });

      const urlTree = router
        .createUrlTree([], {
          relativeTo: route,
          queryParams: sortOptions,
        })
        .toString();

      expect(locationGoSpy).toHaveBeenCalledWith(urlTree);
      expect(routerEventsSpy).not.toHaveBeenCalled();
    });

    it('should update the URL with merged query params', () => {
      const sortOptions: Sort = { active: 'date', direction: 'asc' };
      const pageOptions = {
        page: '2',
        name: 'test',
      };
      const url = '/?' + new URLSearchParams(pageOptions).toString();

      spyOn(location, 'path').and.returnValue(url);

      const expectedMergedParams = {
        ...pageOptions,
        ...sortOptions,
      };

      const urlTree: UrlTree = router.createUrlTree([], {
        relativeTo: route,
        queryParams: expectedMergedParams,
      });

      const locationGoSpy = spyOn(location, 'go');

      service.updateUrl(sortOptions);

      expect(locationGoSpy).toHaveBeenCalledWith(urlTree.toString());
    });

    it('should remove parameters if we provide undefined', () => {
      const region = 'sierra-nevada';
      const pageOptions = {
        page: '2',
        name: 'test',
      };
      const newOptions = {
        page: undefined,
        name: undefined,
        region: region,
      };
      const url = '/?' + new URLSearchParams(pageOptions).toString();

      spyOn(location, 'path').and.returnValue(url);

      const expectedMergedParams = {
        ...pageOptions,
        ...newOptions,
      };

      const urlTree: UrlTree = router.createUrlTree([], {
        relativeTo: route,
        queryParams: expectedMergedParams,
      });

      const locationGoSpy = spyOn(location, 'go');

      service.updateUrl(newOptions);
      expect(urlTree.queryParams['region']).toBe(region);
      expect(urlTree.queryParams['page']).toBe(undefined);
      expect(urlTree.queryParams['name']).toBe(undefined);
      expect(locationGoSpy).toHaveBeenCalledWith(urlTree.toString());
    });
  });
});
