import { TopBarComponent } from './top-bar/top-bar.component';
import { NavigationComponent } from './navigation/navigation.component';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { MockComponent } from 'ng-mocks';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    const fakeAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      { refreshToken: of({ access: true }) },
      {},
    );
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
      ],
      declarations: [
        AppComponent,
        MockComponent(NavigationComponent),
        MockComponent(TopBarComponent),
      ],
      providers: [
        { provide: AuthService, useValue: fakeAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should refresh user token', () => {
      const authServiceStub: AuthService = fixture.debugElement.injector.get(
        AuthService
      );
      expect(authServiceStub.refreshToken).toHaveBeenCalled();
    })
  });
});
