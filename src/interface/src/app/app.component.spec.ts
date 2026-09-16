import { BehaviorSubject, of } from 'rxjs';
import { AuthService, WebSocketService } from '@services';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { FeaturesModule } from '@features/features.module';
import { MockDeclaration, MockProvider } from 'ng-mocks';
import { TopBarComponent } from '@shared/top-bar/top-bar.component';
import { WorkspaceDeletedListenerService } from '@app/workspaces/workspace-deleted-listener.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let isLoggedIn$: BehaviorSubject<boolean | null>;
  let webSocketService: WebSocketService;

  beforeEach(async () => {
    isLoggedIn$ = new BehaviorSubject<boolean | null>(null);
    const fakeAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      { refreshLoggedInUser: of({ username: 'username' }) },
      { isLoggedIn$ }
    );
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, FeaturesModule],
      declarations: [AppComponent, MockDeclaration(TopBarComponent)],
      providers: [
        { provide: AuthService, useValue: fakeAuthService },
        MockProvider(WebSocketService),
        MockProvider(WorkspaceDeletedListenerService),
      ],
    }).compileComponents();

    webSocketService = TestBed.inject(WebSocketService);
    spyOn(webSocketService, 'connect');
    spyOn(webSocketService, 'disconnect');
    spyOn(TestBed.inject(WorkspaceDeletedListenerService), 'start');

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

    it('starts listening for deleted workspaces', () => {
      expect(
        TestBed.inject(WorkspaceDeletedListenerService).start
      ).toHaveBeenCalled();
    });

    it('connects the websocket while logged in and disconnects on logout', () => {
      expect(webSocketService.connect).not.toHaveBeenCalled();

      isLoggedIn$.next(true);
      expect(webSocketService.connect).toHaveBeenCalledTimes(1);

      isLoggedIn$.next(false);
      expect(webSocketService.disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
