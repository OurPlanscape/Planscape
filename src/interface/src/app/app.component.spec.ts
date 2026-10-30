import { BehaviorSubject, of } from 'rxjs';
import { AuthService, WebSocketService } from '@services';
import { User } from '@types';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { FeaturesModule } from '@features/features.module';
import { MockDeclaration, MockProvider } from 'ng-mocks';
import { TopBarComponent } from '@shared/top-bar/top-bar.component';
import { WorkspaceDeletedListenerService } from '@app/workspaces/workspace-deleted-listener.service';
import { WorkspaceState } from '@app/workspaces/workspace.state';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let isLoggedIn$: BehaviorSubject<boolean | null>;
  let currentWorkspaceId$: BehaviorSubject<number | null>;
  let loggedInUser$: BehaviorSubject<User | null | undefined>;
  let connect: jasmine.Spy;
  let disconnect: jasmine.Spy;

  beforeEach(async () => {
    isLoggedIn$ = new BehaviorSubject<boolean | null>(null);
    currentWorkspaceId$ = new BehaviorSubject<number | null>(null);
    loggedInUser$ = new BehaviorSubject<User | null | undefined>({
      id: 1,
      username: 'username',
    } as User);
    const fakeAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      { refreshLoggedInUser: of({ username: 'username' }) },
      { isLoggedIn$, loggedInUser$ }
    );
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, FeaturesModule],
      declarations: [AppComponent, MockDeclaration(TopBarComponent)],
      providers: [
        { provide: AuthService, useValue: fakeAuthService },
        MockProvider(WebSocketService),
        MockProvider(WorkspaceState, { currentWorkspaceId$ }),
        MockProvider(WorkspaceDeletedListenerService),
      ],
    }).compileComponents();

    spyOn(TestBed.inject(WorkspaceDeletedListenerService), 'start');
    connect = spyOn(TestBed.inject(WebSocketService), 'connect');
    disconnect = spyOn(TestBed.inject(WebSocketService), 'disconnect');

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should refresh user token', () => {
      const authServiceStub: AuthService =
        fixture.debugElement.injector.get(AuthService);
      expect(authServiceStub.refreshLoggedInUser).toHaveBeenCalled();
    });

    it('opens the connection of the workspace we walk into', () => {
      expect(connect).not.toHaveBeenCalled();

      currentWorkspaceId$.next(5);

      expect(connect).toHaveBeenCalledWith(5);
    });

    it('closes it on the way out of the workspace', () => {
      currentWorkspaceId$.next(5);

      currentWorkspaceId$.next(null);

      expect(disconnect).toHaveBeenCalled();
    });

    it('waits for the session before opening it', () => {
      loggedInUser$.next(undefined);
      connect.calls.reset();

      currentWorkspaceId$.next(5);
      expect(connect).not.toHaveBeenCalled();

      loggedInUser$.next({ id: 1, username: 'username' } as User);
      expect(connect).toHaveBeenCalledWith(5);
    });

    it('closes it on logout', () => {
      currentWorkspaceId$.next(5);
      disconnect.calls.reset();
      connect.calls.reset();

      loggedInUser$.next(null);

      expect(disconnect).toHaveBeenCalled();
      expect(connect).not.toHaveBeenCalled();
    });

    it('opens it again for the next user of the same workspace', () => {
      currentWorkspaceId$.next(5);
      loggedInUser$.next(null);
      connect.calls.reset();

      loggedInUser$.next({ id: 2, username: 'other' } as User);

      expect(connect).toHaveBeenCalledWith(5);
    });

    it('leaves it alone when the same user is emitted again', () => {
      currentWorkspaceId$.next(5);
      disconnect.calls.reset();
      connect.calls.reset();

      loggedInUser$.next({ id: 1, username: 'renamed' } as User);

      expect(disconnect).not.toHaveBeenCalled();
      expect(connect).not.toHaveBeenCalled();
    });

    it('starts listening for deleted workspaces', () => {
      expect(
        TestBed.inject(WorkspaceDeletedListenerService).start
      ).toHaveBeenCalled();
    });
  });
});
