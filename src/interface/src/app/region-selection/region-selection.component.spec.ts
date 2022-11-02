import { AppState, userUpdateRegionAction } from '../state';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Region } from '../types';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { RegionSelectionComponent } from './region-selection.component';

describe('RegionSelectionComponent', () => {
  let component: RegionSelectionComponent;
  let fixture: ComponentFixture<RegionSelectionComponent>;
  let store: MockStore<AppState>;

  const initialState = {
    user: {
      currentUser: undefined,
      region: undefined,
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegionSelectionComponent ],
      providers: [ provideMockStore({initialState})]
    })
    .compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(RegionSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set available region', () => {
    const dispatchSpy = spyOn(store, 'dispatch').and.callThrough();
    const element: HTMLElement = fixture.nativeElement;
    const sierraNevadaElement: any = element.querySelectorAll('.region-button')[0];

    sierraNevadaElement.click();

    expect(dispatchSpy).toHaveBeenCalledWith(
      userUpdateRegionAction({region: Region.SIERRA_NEVADA})
    );
  });

  it('should disable unavailable regions', () => {
    const dispatchSpy = spyOn(store, 'dispatch').and.callThrough();
    const element: HTMLElement = fixture.nativeElement;
    const regionElement: any = element.querySelectorAll('.region-button')[2];

    regionElement.click();

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
