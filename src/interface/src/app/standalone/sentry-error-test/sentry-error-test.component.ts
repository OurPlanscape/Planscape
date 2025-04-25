import { Component } from '@angular/core';

@Component({
  selector: 'app-sentry-error-test',
  standalone: true,
  imports: [],
  templateUrl: './sentry-error-test.component.html',
  styleUrl: './sentry-error-test.component.scss',
})
export class SentryErrorTestComponent {
  throwAnError() {
    throw new SentryExampleError(
      'This error was thrown by the Sentry example component.'
    );
  }
}

class SentryExampleError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = 'SentryExampleError';
  }
}
