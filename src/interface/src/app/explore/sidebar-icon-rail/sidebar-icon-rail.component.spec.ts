import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  SidebarIconRailComponent,
  SidebarRailItem,
} from './sidebar-icon-rail.component';

describe('SidebarIconRailComponent', () => {
  let component: SidebarIconRailComponent;
  let fixture: ComponentFixture<SidebarIconRailComponent>;

  const items: SidebarRailItem[] = [
    { id: 'data-layers', icon: 'category', label: 'Data Layers' },
    { id: 'favorites', icon: 'star', label: 'Favorites', disabled: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarIconRailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarIconRailComponent);
    component = fixture.componentInstance;
    component.items = items;
    fixture.detectChanges();
  });

  function railButtons() {
    return fixture.debugElement.queryAll(By.css('.rail-button'));
  }

  it('renders a button per item', () => {
    expect(railButtons().length).toBe(items.length);
  });

  it('marks the active item', () => {
    component.activeId = 'data-layers';
    fixture.detectChanges();

    expect(railButtons()[0].nativeElement.classList).toContain('active');
    expect(railButtons()[1].nativeElement.classList).not.toContain('active');
  });

  it('emits the selected item', () => {
    spyOn(component.itemSelected, 'emit');
    railButtons()[0].nativeElement.click();

    expect(component.itemSelected.emit).toHaveBeenCalledWith(items[0]);
  });

  it('does not emit for disabled items', () => {
    spyOn(component.itemSelected, 'emit');
    railButtons()[1].nativeElement.click();

    expect(component.itemSelected.emit).not.toHaveBeenCalled();
  });
});
