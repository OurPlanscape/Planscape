import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, of, Subject } from 'rxjs';
import { WorkspaceDataLayersService } from '@services/workspace-data-layers.service';
import { WorkspaceDataLayer, WorkspaceDataLayerCreated } from '@types';
import {
  MAX_UPLOAD_BYTES,
  nameFromFile,
  UploadDataLayerComponent,
} from './upload-data-layer.component';

const layer = { id: 5, name: 'Canopy cover' } as WorkspaceDataLayer;

function tif(name = 'canopy_cover.tif', size?: number) {
  const file = new File(['data'], name, { type: 'image/tiff' });
  if (size !== undefined) {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
}

describe('UploadDataLayerComponent', () => {
  let component: UploadDataLayerComponent;
  let fixture: ComponentFixture<UploadDataLayerComponent>;
  let service: jasmine.SpyObj<WorkspaceDataLayersService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<UploadDataLayerComponent>>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let created$: Subject<WorkspaceDataLayerCreated>;
  let progress$: Subject<number>;
  let confirmed$: Subject<boolean>;

  beforeEach(async () => {
    created$ = new Subject();
    progress$ = new Subject();
    confirmed$ = new Subject();
    service = jasmine.createSpyObj('WorkspaceDataLayersService', [
      'createUpload',
      'uploadFile',
      'deleteDataLayer',
    ]);
    service.createUpload.and.returnValue(created$);
    service.uploadFile.and.returnValue(progress$);
    service.deleteDataLayer.and.returnValue(of(undefined));
    dialogRef = jasmine.createSpyObj('MatDialogRef', [
      'close',
      'backdropClick',
      'keydownEvents',
    ]);
    dialogRef.backdropClick.and.returnValue(EMPTY);
    dialogRef.keydownEvents.and.returnValue(EMPTY);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    dialog.open.and.returnValue({
      afterClosed: () => confirmed$,
      close: jasmine.createSpy('close'),
    } as any);

    await TestBed.configureTestingModule({
      imports: [UploadDataLayerComponent, NoopAnimationsModule],
      providers: [
        { provide: WorkspaceDataLayersService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { workspaceId: 7 } },
      ],
    })
      .overrideProvider(MatDialog, { useValue: dialog })
      .compileComponents();

    fixture = TestBed.createComponent(UploadDataLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function startUpload(file = tif()) {
    component.handleFile(file);
    component.submit();
    created$.next({
      datalayer: layer,
      upload_to: { url: 'https://storage.example/session' },
    });
    created$.complete();
  }

  it('keeps backdrop and Escape from closing the dialog directly', () => {
    expect(dialogRef.disableClose).toBeTrue();
  });

  describe('picking a file', () => {
    it('suggests a name from the file name', () => {
      component.handleFile(tif('canopy_cover-2024.TIFF'));

      expect(component.form.controls.name.value).toBe('canopy cover 2024');
      expect(component.canSubmit).toBeTrue();
    });

    it('keeps a name the user typed', () => {
      component.form.controls.name.setValue('My layer');
      component.handleFile(tif());

      expect(component.form.controls.name.value).toBe('My layer');
    });

    it('replaces its own suggestion when the file changes', () => {
      component.handleFile(tif('first.tif'));
      component.handleFile(tif('second.tif'));

      expect(component.form.controls.name.value).toBe('second');
    });

    it('rejects files that are not GeoTIFFs', () => {
      component.handleFile(new File(['x'], 'area.zip'));

      expect(component.fileStatus).toBe('failed');
      expect(component.error).toContain('GeoTIFF');
      expect(component.canSubmit).toBeFalse();
    });

    it('rejects files over the size limit', () => {
      component.handleFile(tif('big.tif', MAX_UPLOAD_BYTES + 1));

      expect(component.error).toContain('2 GB');
      expect(component.canSubmit).toBeFalse();
    });

    it('needs a non-blank name', () => {
      component.handleFile(tif());
      component.form.controls.name.setValue('   ');

      expect(component.canSubmit).toBeFalse();
    });
  });

  describe('uploading', () => {
    it('creates the layer, then PUTs the file to the upload session', () => {
      const file = tif();
      startUpload(file);

      expect(service.createUpload).toHaveBeenCalledWith(7, {
        name: 'canopy cover',
        original_name: 'canopy_cover.tif',
        size: file.size,
      });
      expect(service.uploadFile).toHaveBeenCalledWith(
        'https://storage.example/session',
        file
      );
      expect(component.uploading).toBeTrue();
      expect(component.form.disabled).toBeTrue();
    });

    it('shows progress and closes with the layer when the PUT finishes', () => {
      startUpload();
      progress$.next(0.4);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('40%');

      progress$.next(1);
      progress$.complete();

      expect(dialogRef.close).toHaveBeenCalledWith(layer);
      expect(service.deleteDataLayer).not.toHaveBeenCalled();
    });

    it('shows the field error when create is rejected', () => {
      component.handleFile(tif());
      component.submit();
      created$.error(
        new HttpErrorResponse({
          status: 400,
          error: { errors: { name: ['A data layer with this name exists.'] } },
        })
      );

      expect(component.error).toBe('A data layer with this name exists.');
      expect(component.uploading).toBeFalse();
      expect(component.form.enabled).toBeTrue();
      expect(service.deleteDataLayer).not.toHaveBeenCalled();
    });

    it('explains when uploads are not available', () => {
      component.handleFile(tif());
      component.submit();
      created$.error(new HttpErrorResponse({ status: 501 }));

      expect(component.error).toContain("aren't available");
    });

    it('discards the pending layer when the PUT fails', () => {
      startUpload();
      progress$.error(new HttpErrorResponse({ status: 0 }));

      expect(service.deleteDataLayer).toHaveBeenCalledWith(7, layer.id);
      expect(component.error).toContain('upload failed');
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('closing', () => {
    it('closes right away when nothing is uploading', () => {
      component.close();

      expect(dialog.open).not.toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalled();
    });

    it('asks before cancelling an upload in progress', () => {
      startUpload();
      component.close();

      expect(dialog.open).toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('keeps uploading when the user declines', () => {
      startUpload();
      component.close();
      confirmed$.next(false);

      expect(component.uploading).toBeTrue();
      expect(progress$.observed).toBeTrue();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('stops the PUT and discards the layer when the user confirms', () => {
      startUpload();
      component.close();
      confirmed$.next(true);

      expect(progress$.observed).toBeFalse();
      expect(service.deleteDataLayer).toHaveBeenCalledWith(7, layer.id);
      expect(dialogRef.close).toHaveBeenCalledWith();
    });

    it('discards the layer once it exists when cancelled while being created', () => {
      component.handleFile(tif());
      component.submit();
      component.close();
      confirmed$.next(true);

      expect(service.deleteDataLayer).not.toHaveBeenCalled();
      created$.next({
        datalayer: layer,
        upload_to: { url: 'https://storage.example/session' },
      });
      created$.complete();

      expect(service.uploadFile).not.toHaveBeenCalled();
      expect(service.deleteDataLayer).toHaveBeenCalledWith(7, layer.id);
      expect(dialogRef.close).toHaveBeenCalledOnceWith();
    });
  });

  describe('nameFromFile', () => {
    it('drops the extension and separators', () => {
      expect(nameFromFile('fire_risk-v2.tif')).toBe('fire risk v2');
    });
  });
});
