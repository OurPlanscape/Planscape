import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarRef,
} from '@angular/material/snack-bar';
import { DataLayerReadyNoticeComponent } from './data-layer-ready-notice.component';

describe('DataLayerReadyNoticeComponent', () => {
  let fixture: ComponentFixture<DataLayerReadyNoticeComponent>;
  let snackBarRef: jasmine.SpyObj<MatSnackBarRef<unknown>>;

  const create = (canEdit = true) => {
    snackBarRef = jasmine.createSpyObj('MatSnackBarRef', [
      'dismiss',
      'dismissWithAction',
    ]);
    TestBed.configureTestingModule({
      imports: [DataLayerReadyNoticeComponent],
      providers: [
        { provide: MAT_SNACK_BAR_DATA, useValue: { name: 'Canopy', canEdit } },
        { provide: MatSnackBarRef, useValue: snackBarRef },
      ],
    });
    fixture = TestBed.createComponent(DataLayerReadyNoticeComponent);
    fixture.detectChanges();
  };

  const el = () => fixture.nativeElement as HTMLElement;

  it('names the layer in the title', () => {
    create();
    expect(el().querySelector('.title')?.textContent).toContain(
      'Layer "Canopy" is ready'
    );
  });

  it('edits the layer from the CTA', () => {
    create();
    el().querySelector<HTMLButtonElement>('.cta')!.click();
    expect(snackBarRef.dismissWithAction).toHaveBeenCalled();
  });

  it('closes from the close button', () => {
    create();
    el().querySelector<HTMLButtonElement>('.close')!.click();
    expect(snackBarRef.dismiss).toHaveBeenCalled();
  });

  it('hides the CTA when there is no layer to link to', () => {
    create(false);
    expect(el().querySelector('.cta')).toBeNull();
  });
});
