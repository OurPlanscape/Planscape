import { BehaviorSubject } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { By } from '@angular/platform-browser';

import { AccountDialogComponent } from './../account-dialog/account-dialog.component';
import { TopBarComponent } from './top-bar.component';
import { SessionService } from './../session.service';
import { Region } from '../types';

describe('TopBarComponent', () => {
  let component: TopBarComponent;
  let fixture: ComponentFixture<TopBarComponent>;
  let mockSessionService: Partial<SessionService>;

  beforeEach(async () => {
    const fakeMatDialog = jasmine.createSpyObj<MatDialog>(
      'MatDialog',
      {
        open: undefined,
      },
      {});
    mockSessionService = {
      region$: new BehaviorSubject<Region|null>(null),
      setRegion: () => {},
    };
    await TestBed.configureTestingModule({
      imports: [ MatDialogModule, MatIconModule, MatToolbarModule ],
      declarations: [ TopBarComponent ],
      providers: [
        { provide: MatDialog, useValue: fakeMatDialog },
        { provide: SessionService, useValue: mockSessionService },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle sidenav', () => {
    spyOn(component.toggleEvent, 'emit');

    // Act: click on the menu icon
    const menuButton = fixture.debugElement.query(By.css('[data-testid="menu-button"]'));
    const clickEvent = new MouseEvent('click');
    menuButton.triggerEventHandler('click', clickEvent);

    // Assert: expect that the toggleEvent emits the Event
    expect(component.toggleEvent.emit).toHaveBeenCalledOnceWith(clickEvent);
  });

  it('should open account dialog', () => {
    const fakeMatDialog: MatDialog = fixture.debugElement.injector.get(
      MatDialog
    );

    // Act: click on the account icon
    const accountButton = fixture.debugElement.query(By.css('[data-testid="account-button"]'));
    const clickEvent = new MouseEvent('click');
    accountButton.triggerEventHandler('click', clickEvent);

    // Assert: expect that the dialog opens
    expect(fakeMatDialog.open).toHaveBeenCalledOnceWith(AccountDialogComponent);
  });

  describe('Region selection dropdown', () => {
    it('should set the region', () => {
      const setRegionSpy = spyOn<any>(mockSessionService, 'setRegion');
      const regionDropdown = fixture.debugElement.query(By.css('[class="region-dropdown"]')).nativeElement;

      regionDropdown.value = regionDropdown.options[0].value;
      regionDropdown.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(setRegionSpy).toHaveBeenCalled();
    });
  });

});
