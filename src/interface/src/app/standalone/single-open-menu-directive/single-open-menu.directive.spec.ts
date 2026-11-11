import { Component, ViewChild } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flush,
} from '@angular/core/testing';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SingleOpenMenuDirective } from './single-open-menu.directive';

@Component({
  standalone: true,
  imports: [MatMenuModule, SingleOpenMenuDirective],
  template: `
    <button
      [matMenuTriggerFor]="firstMenu"
      #first="matMenuTrigger"
      appSingleOpenMenu>
      first
    </button>
    <mat-menu #firstMenu="matMenu" [hasBackdrop]="false">
      <p>first menu</p>
    </mat-menu>

    <button
      [matMenuTriggerFor]="secondMenu"
      #second="matMenuTrigger"
      appSingleOpenMenu>
      second
    </button>
    <mat-menu #secondMenu="matMenu" [hasBackdrop]="false">
      <p>second menu</p>
    </mat-menu>

    <button [matMenuTriggerFor]="looseMenu" #loose="matMenuTrigger">
      loose
    </button>
    <mat-menu #looseMenu="matMenu" [hasBackdrop]="false">
      <p>loose menu</p>
    </mat-menu>
  `,
})
class TestHostComponent {
  @ViewChild('first') first!: MatMenuTrigger;
  @ViewChild('second') second!: MatMenuTrigger;
  @ViewChild('loose') loose!: MatMenuTrigger;
}

describe('SingleOpenMenuDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
  });

  function open(trigger: MatMenuTrigger) {
    trigger.openMenu();
    fixture.detectChanges();
    flush();
  }

  it('closes the open menu when another one opens', fakeAsync(() => {
    open(host.first);
    expect(host.first.menuOpen).toBe(true);

    open(host.second);

    expect(host.first.menuOpen).toBe(false);
    expect(host.second.menuOpen).toBe(true);
  }));

  it('leaves menus without the directive alone', fakeAsync(() => {
    open(host.loose);
    open(host.first);

    expect(host.loose.menuOpen).toBe(true);
    expect(host.first.menuOpen).toBe(true);
  }));

  it('keeps the menu open when it is re-opened on its own', fakeAsync(() => {
    open(host.first);
    open(host.first);

    expect(host.first.menuOpen).toBe(true);
  }));

  it('forgets a menu that closed, so the next one stays open', fakeAsync(() => {
    open(host.first);
    host.first.closeMenu();
    fixture.detectChanges();
    flush();

    open(host.second);

    expect(host.second.menuOpen).toBe(true);
  }));
});
