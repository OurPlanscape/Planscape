import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LegacyMaterialModule } from '../../material/legacy-material.module';

import { FileUploaderComponent } from './file-uploader.component';

describe('FileUploaderComponent', () => {
  let component: FileUploaderComponent;
  let fixture: ComponentFixture<FileUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegacyMaterialModule],
      declarations: [FileUploaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FileUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should update the file model when a file is loaded', () => {
    const fileList = new DataTransfer();
    fileList.items.add(new File([''], 'test-file.zip'));
    const inputDebugEl = fixture.debugElement.query(By.css('input[type=file]'));
    inputDebugEl.nativeElement.files = fileList.files;

    inputDebugEl.nativeElement.dispatchEvent(new InputEvent('change'));
    fixture.detectChanges();

    expect(component.file).toBeTruthy();
    expect(component.fileName).toBe('test-file.zip');
  });

  it('file upload event should emit the file', () => {
    const element = fixture.nativeElement;
    const input = element.querySelector('.file-input');
    spyOn(component, 'onFileUploaded').and.callThrough();
    spyOn(component.fileEvent, 'emit');

    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.onFileUploaded).toHaveBeenCalled();
    expect(component.fileEvent.emit).toHaveBeenCalled();
  });
});
