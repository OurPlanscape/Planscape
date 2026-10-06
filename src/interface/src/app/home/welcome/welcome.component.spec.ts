import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { WelcomeComponent } from './welcome.component';
import { FeaturesModule } from '@features/features.module';
import { overrideFeatureFlags } from '@features/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('WelcomeComponent', () => {
  let component: WelcomeComponent;
  let fixture: ComponentFixture<WelcomeComponent>;

  function setUpComponent(flags: string[] = []) {
    TestBed.configureTestingModule({
      imports: [WelcomeComponent, FeaturesModule, RouterTestingModule],
    });
    overrideFeatureFlags(...flags);

    fixture = TestBed.createComponent(WelcomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function exploreLink() {
    return fixture.debugElement.query(By.css('a[routerLink="/map-viewer"]'));
  }

  beforeEach(async () => {
    setUpComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sends visitors to sign in, the map viewer needs a workspace', () => {
    expect(exploreLink()).toBeNull();
    expect(
      fixture.debugElement.query(By.css('a[routerLink="/login"]'))
    ).not.toBeNull();
  });
});
