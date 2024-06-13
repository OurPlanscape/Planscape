import { Component, Input, HostBinding } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type UploadStatus = 'default' | 'running' | 'success' | 'failed';

@Component({
  selector: 'sg-file-upload',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './file-upload-field.component.html',
  styleUrl: './file-upload-field.component.scss',
})
export class FileUploadFieldComponent {
  @Input() fieldLabel = 'Label';
  @Input() innerLabel = 'Choose a file to upload';
  @Input() disabled = false;
  @Input() uploadStatus: string = 'default';

  files: FileList | undefined;

  onFileSelected(event: any) {
    //TODO: just a placeholder...
    // assume we just want one file?
    this.files = event.target.files;
    if (this.files) {
      this.innerLabel = this.files[0].name;
    }
  }

  readonly iconByStatus: Record<UploadStatus, string> = {
    default: '',
    running: 'progress_activity',
    success: 'check_circle',
    failed: 'error',
  };

  readonly classByStatus: Record<UploadStatus, string> = {
    default: '',
    running: 'running',
    success: 'success',
    failed: 'failed',
  };

  @HostBinding('class.default')
  get isNotStarted() {
    return this.uploadStatus === 'default';
  }

  @HostBinding('class.success')
  get isSuccess() {
    return this.uploadStatus === 'success';
  }

  @HostBinding('class.failed')
  get isFailed() {
    return this.uploadStatus === 'failed';
  }

  @HostBinding('class.running')
  get isRunning() {
    return this.uploadStatus === 'running';
  }
}
