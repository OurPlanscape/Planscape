import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-file-uploader',
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.scss'],
})
export class FileUploaderComponent {
  /** File uploaded event. */
  @Output() fileEvent = new EventEmitter<any>();

  fileName = '';
  file: File | null = null;

  @Input()
  requiredFileType: string = 'application/zip';

  onFileUploaded(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files as FileList;
    if (target.files) {
      this.file = files.item(0);
      this.fileName = this.file?.name || '';
      this.emitEvent(this.file!);
    }
  }

  /**
   * Emits a file upload event to the parent component.
   */
  private emitEvent(file: File) {
    this.fileEvent.emit({ type: 'area_upload', value: file });
  }
}
