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
  @Input() fieldLabel = 'Label';
  @Input() placeholder = 'Choose a shape file to upload';
  @Input() disabled = false;
  @Input() uploadStatus: UploadStatus = 'default';
  @Input()
  supportedTypes: string[] = ['application/zip'];
  @Output() fileEvent = new EventEmitter<any>();

  file: File | null = null;

  onFileUploaded(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files as FileList;
    if (target.files) {
      this.file = files.item(0);
      this.fileEvent.emit(this.file!);
    }
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
