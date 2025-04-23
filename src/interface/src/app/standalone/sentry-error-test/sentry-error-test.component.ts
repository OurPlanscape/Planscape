import { Component } from '@angular/core';
import { SentryExampleComponent } from 'src/app/sentry-example.component';

@Component({
  selector: 'app-sentry-error-test',
  standalone: true,
  imports: [SentryExampleComponent],
  templateUrl: './sentry-error-test.component.html',
  styleUrl: './sentry-error-test.component.scss',
})
export class SentryErrorTestComponent {}
