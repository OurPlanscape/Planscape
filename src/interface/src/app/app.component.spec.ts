import { of } from 'rxjs';
import { AuthService } from '@services';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { FeaturesModule } from './features/features.module';
import { MockDeclaration } from 'ng-mocks';
import { TopBarComponent } from './shared/top-bar/top-bar.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    const fakeAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      { refreshLoggedInUser: of({ username: 'username' }) },
      {}
    );
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, FeaturesModule],
      declarations: [AppComponent, MockDeclaration(TopBarComponent)],
      providers: [{ provide: AuthService, useValue: fakeAuthService }],
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
      const authServiceStub: AuthService =
        fixture.debugElement.injector.get(AuthService);
      expect(authServiceStub.refreshLoggedInUser).toHaveBeenCalled();
    });
  });
});
