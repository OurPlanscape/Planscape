import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolInfoCardComponent } from './tool-info-card.component';

describe('ToolInfoCardComponent', () => {
  let component: ToolInfoCardComponent;
  let fixture: ComponentFixture<ToolInfoCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolInfoCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolInfoCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits the partner when its logo is clicked, so consumers can track it', () => {
    const partner = {
      name: 'Partner',
      url: 'https://partner.example',
      logo: 'logo.png',
    };
    component.partners = [partner];
    fixture.detectChanges();
    const emitted: unknown[] = [];
    component.clickPartner.subscribe((p) => emitted.push(p));

    const link: HTMLAnchorElement =
      fixture.nativeElement.querySelector('.partners a');
    // The anchor navigates on click, which karma would follow.
    link.addEventListener('click', (event) => event.preventDefault());
    link.click();

    expect(emitted).toEqual([partner]);
  });

  it('renders nothing in the partners section without partners', () => {
    component.partners = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.partners')).toBeNull();
  });
});
