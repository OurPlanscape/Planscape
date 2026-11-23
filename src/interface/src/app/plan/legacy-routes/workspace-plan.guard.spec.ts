import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProvider } from 'ng-mocks';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { PlanService } from '@services';
import { Plan } from '@types';
import { workspacePlanGuard } from './workspace-plan.guard';

describe('workspacePlanGuard', () => {
  let getPlan: jasmine.Spy;

  async function run(url: string) {
    const result = TestBed.runInInjectionContext(() =>
      workspacePlanGuard(
        {} as ActivatedRouteSnapshot,
        { url } as RouterStateSnapshot
      )
    );
    return isObservable(result) ? firstValueFrom(result) : result;
  }

  beforeEach(() => {
    getPlan = jasmine.createSpy('getPlan');
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [MockProvider(PlanService, { getPlan })],
    });
  });

  it('sends a plan to its workspace, keeping the rest of the url', async () => {
    getPlan.and.returnValue(of({ id: 9, workspace: 5 } as Plan));

    const result = await run('/plan/9/scenario/3/dashboard?tab=1');

    expect(getPlan).toHaveBeenCalledWith('9');
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/workspace/5/plan/9/scenario/3/dashboard?tab=1'
    );
  });

  it('sends the map viewer to the workspace too', async () => {
    getPlan.and.returnValue(of({ id: 9, workspace: 5 } as Plan));

    const result = await run('/map-viewer/9/3');

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/workspace/5/map-viewer/9/3'
    );
  });

  it('leaves plans without a workspace alone', async () => {
    getPlan.and.returnValue(of({ id: 9, workspace: null } as Plan));

    expect(await run('/plan/9')).toBeTrue();
  });

  it('lets the plan page deal with a plan it cannot load', async () => {
    getPlan.and.returnValue(throwError(() => new Error('nope')));

    expect(await run('/plan/9')).toBeTrue();
  });

  it('does not look anything up for other urls', async () => {
    expect(await run('/plan')).toBeTrue();
    expect(getPlan).not.toHaveBeenCalled();
  });
});
