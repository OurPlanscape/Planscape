import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavBarComponent } from './nav-bar.component';
import { WINDOW } from '../../services/window.service';
import { By } from '@angular/platform-browser';

describe('NavBarComponent', () => {
  let component: NavBarComponent;
  let fixture: ComponentFixture<NavBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NavBarComponent],
      providers: [
        {
          provide: WINDOW,
          useValue: {
            location: {
              href: 'some-url',
            },
            navigator: { clipboard: { writeText: () => {} } },
            print: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should copy the link when clicking on copy', () => {
    const window = TestBed.inject(WINDOW);
    spyOn(window.navigator.clipboard, 'writeText');
    const copyLink = fixture.debugElement.query(By.css('[data-id="copy"]'));

    copyLink.nativeElement.click();

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
      window.location.href
    );
  });

  it('should open print menu when clicking on print', () => {
    const window = TestBed.inject(WINDOW);
    spyOn(window, 'print');
    const printLink = fixture.debugElement.query(By.css('[data-id="print"]'));
    printLink.nativeElement.click();

    expect(window.print).toHaveBeenCalled();
  });
});
