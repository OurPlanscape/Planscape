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

  it('offers Explore', () => {
    expect(exploreLink()).not.toBeNull();
  });

  it('hides Explore when workspaces are enabled', () => {
    // the map viewer needs a workspace, so there is nowhere for a logged out
    // visitor to go
    TestBed.resetTestingModule();
    setUpComponent(['WORKSPACES']);

    expect(exploreLink()).toBeNull();
    expect(
      fixture.debugElement.query(By.css('a[routerLink="/login"]'))
    ).not.toBeNull();
  });
});
