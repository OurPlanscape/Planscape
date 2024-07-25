import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../button/button.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type UploadStatus = 'default' | 'running' | 'uploaded' | 'failed';
export type MimeType = {
  mime: string;
  suffix: string;
};

@Component({
  selector: 'sg-file-upload',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    ButtonComponent,
    MatProgressSpinnerModule,
    NgIf,
  ],
  templateUrl: './file-upload-field.component.html',
  styleUrl: './file-upload-field.component.scss',
})
export class FileUploadFieldComponent {
  @Input() fieldLabel?: string;
  @Input() placeholder = 'Choose a shape file to upload';
  @Input() disabled = false;
  @Input() required = true;
  @Input() uploadStatus: UploadStatus = 'default';
  @Input() supportedTypes: MimeType[] = [
    { mime: 'application/zip', suffix: 'zip' },
  ];
  @Input() supportedFileInfo?: string | null;
  @Output() fileEvent = new EventEmitter<File>();
  @Output() uploadFailure = new EventEmitter<void>();

  file: File | null = null;

  onFileUploaded(event: Event) {
    this.uploadStatus = 'running';
    const target = event.target as HTMLInputElement;
    const files = target.files as FileList;
    if (target.files) {
      this.file = files.item(0);
      this.uploadStatus = 'uploaded';
      this.fileEvent.emit(this.file!);
    } else {
      this.uploadFailure.emit();
    }
  }

  get acceptedMimeTypes(): string {
    return this.supportedTypes.map((t) => t.mime).join(', ');
  }

  get acceptedSuffixes(): string {
    return this.supportedTypes.map((t) => `.${t.suffix}`).join(', ');
  }
  resetFile() {
    this.file = null;
    this.uploadStatus = 'default';
  }

  get hasFile() {
    return this.file !== null;
  }

  @HostBinding('class.default')
  get isDefault() {
    return this.uploadStatus === 'default';
  }

  @HostBinding('class.uploaded')
  get isUploaded() {
    return this.uploadStatus === 'uploaded';
  }

  @HostBinding('class.failed')
  get isFailed() {
    return this.uploadStatus === 'failed';
  }

  @HostBinding('class.running')
  get isRunning() {
    return this.uploadStatus === 'running';
  }

  @HostBinding('class.disabled')
  get isDisabled() {
    return this.disabled;
  }
}
