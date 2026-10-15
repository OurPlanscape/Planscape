import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { MockComponent } from 'ng-mocks';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import {
  BrowseSelection,
  DataLayersStateService,
} from '../data-layers.state.service';
import { DataLayersRailComponent } from './data-layers-rail.component';

describe('DataLayersRailComponent', () => {
  let fixture: ComponentFixture<DataLayersRailComponent>;
  let selection$: BehaviorSubject<BrowseSelection | null>;
  let state: jasmine.SpyObj<DataLayersStateService>;

  beforeEach(async () => {
    selection$ = new BehaviorSubject<BrowseSelection | null>(null);
    state = jasmine.createSpyObj<DataLayersStateService>(
      'DataLayersStateService',
      ['goBackToSearchResults'],
      { selection$ }
    );

    await TestBed.configureTestingModule({
      imports: [DataLayersRailComponent],
      providers: [{ provide: DataLayersStateService, useValue: state }],
    })
      .overrideComponent(DataLayersRailComponent, {
        remove: { imports: [DataLayersComponent] },
        add: { imports: [MockComponent(DataLayersComponent)] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DataLayersRailComponent);
    fixture.componentRef.setInput('displayAddButton', true);
    fixture.componentRef.setInput('stickySearch', true);
    fixture.detectChanges();
  });

  const title = () =>
    fixture.debugElement.query(By.css('.panel-header h4')).nativeElement
      .textContent;

  it('shows the rail with only data layers selectable', () => {
    const buttons = fixture.debugElement.queryAll(By.css('.rail-button'));
    expect(buttons.length).toBe(3);
    expect(buttons[0].nativeElement.classList).toContain('active');
    expect(
      buttons
        .slice(1)
        .every((b) => b.nativeElement.classList.contains('disabled'))
    ).toBeTrue();
  });

  it('titles the panel "Data Layers" while browsing the list', () => {
    expect(title()).toContain('Data Layers');
    expect(fixture.debugElement.query(By.css('.back-button'))).toBeNull();
  });

  it('shows the open category with a way back', () => {
    selection$.next({ type: 'category', id: 20, name: 'Air Quality' });
    fixture.detectChanges();

    expect(title()).toContain('Air Quality');
    fixture.debugElement.query(By.css('.back-button')).nativeElement.click();
    expect(state.goBackToSearchResults).toHaveBeenCalled();
  });

  it('passes its options to the data layers, minus the in-list header', () => {
    const layers = fixture.debugElement.query(By.css('app-data-layers'));
    const instance = layers.componentInstance as DataLayersComponent;

    expect(instance.displayAddButton).toBeTrue();
    expect(instance.showSelectionHeader).toBeFalse();
    expect(layers.nativeElement.classList).toContain('sticky-search');
  });
});
