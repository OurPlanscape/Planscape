import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScrollSpyDirective } from './scroll-spy.directive';

@Component({
  standalone: true,
  imports: [ScrollSpyDirective],
  template: `
    <nav
      [appScrollSpy]="ids"
      [spyRoot]="root"
      (activeSection)="active = $event"
      #spy="appScrollSpy"></nav>
    <div #root class="root" style="height: 100px; overflow: auto">
      <section id="a" style="height: 300px; scroll-margin-top: 10px"></section>
      <section id="b" style="height: 300px; scroll-margin-top: 10px"></section>
    </div>
  `,
})
class TestHostComponent {
  @ViewChild(ScrollSpyDirective) spy!: ScrollSpyDirective;
  ids = ['a', 'b'];
  root!: HTMLElement;
  active = '';
}

describe('ScrollSpyDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    component.root = fixture.nativeElement.querySelector('.root');
    fixture.detectChanges();
  });

  it('creates the directive', () => {
    expect(component.spy).toBeTruthy();
  });

  it('scrollTo emits the target section and scrolls it into view', () => {
    const target = fixture.nativeElement.querySelector('#b') as HTMLElement;
    const spy = spyOn(target, 'scrollIntoView');

    component.spy.scrollTo('b');

    expect(component.active).toBe('b');
    expect(spy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('scrollTo is a no-op emit when the target is already active', () => {
    component.spy.scrollTo('a');
    component.active = 'changed';

    // 'a' is already the active target, so no new emission overwrites the test value
    component.spy.scrollTo('a');

    expect(component.active).toBe('changed');
  });
});
