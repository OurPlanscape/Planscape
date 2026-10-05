import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { MapSelectorComponent } from '@explore/map-selector/map-selector.component';
import { MockComponents } from 'ng-mocks';
import { LegacySidebarComponent } from './legacy-sidebar.component';

describe('LegacySidebarComponent', () => {
  let component: LegacySidebarComponent;
  let fixture: ComponentFixture<LegacySidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegacySidebarComponent, BrowserAnimationsModule],
    })
      .overrideComponent(LegacySidebarComponent, {
        remove: { imports: [MapSelectorComponent, BaseLayersComponent] },
        add: {
          imports: MockComponents(MapSelectorComponent, BaseLayersComponent),
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LegacySidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the tab group when expanded', () => {
    expect(fixture.debugElement.query(By.css('mat-tab-group'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.expanded-label'))).toBeNull();
  });

  it('renders the collapsed label instead of the tabs when collapsed', () => {
    component.expanded = false;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('mat-tab-group'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.expanded-label'))).toBeTruthy();
  });

  it('emits the toggled expanded state', () => {
    spyOn(component.expandedChange, 'emit');
    fixture.debugElement.query(By.css('.expander')).nativeElement.click();

    expect(component.expandedChange.emit).toHaveBeenCalledWith(false);
  });
});
