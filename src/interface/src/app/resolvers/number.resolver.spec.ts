import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { Observable } from 'rxjs';
import { numberResolver } from './number.resolver';

describe('numberResolver', () => {
  let mockRouter: jasmine.SpyObj<Router>;
  let routeSnapshot: ActivatedRouteSnapshot;
  let routerStateSnapshot: RouterStateSnapshot;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    routeSnapshot = new ActivatedRouteSnapshot();
    routerStateSnapshot = jasmine.createSpyObj<RouterStateSnapshot>(
      'RouterStateSnapshot',
      [],
      { url: '/test' }
    );

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: mockRouter }],
    });
  });

  function createResolver(
    paramName: string,
    redirectTo: string
  ): Observable<number | null> {
    const resolver = numberResolver(paramName, redirectTo);
    return resolver(routeSnapshot, routerStateSnapshot) as Observable<
      number | null
    >;
  }

  it('should resolve a valid positive number parameter', (done) => {
    TestBed.runInInjectionContext(() => {
      spyOn(routeSnapshot.paramMap, 'get').and.returnValue('42');

      createResolver('id', '/redirect').subscribe((result) => {
        expect(result).toBe(42);
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        done();
      });
    });
  });

  it('should navigate to redirect route if parameter is not a number', (done) => {
    TestBed.runInInjectionContext(() => {
      spyOn(routeSnapshot.paramMap, 'get').and.returnValue('abc');

      createResolver('id', '/redirect').subscribe((result) => {
        expect(result).toBeNull();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/redirect']);
        done();
      });
    });
  });

  it('should navigate to redirect route if parameter is null', (done) => {
    TestBed.runInInjectionContext(() => {
      spyOn(routeSnapshot.paramMap, 'get').and.returnValue(null);

      createResolver('id', '/redirect').subscribe((result) => {
        expect(result).toBeNull();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/redirect']);
        done();
      });
    });
  });
});
