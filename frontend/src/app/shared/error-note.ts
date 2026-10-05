import { Component, input, output } from '@angular/core';
import { ApiError } from '../core/api-error';

@Component({
  selector: 'app-error-note',
  host: { class: 'contents' }, // no box when empty, so it never adds a gap to the parent grid
  template: `
    @if (error(); as e) {
      <div role="alert" class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
        {{ e.message }}
        @if (retryable()) {
          <button type="button" (click)="retry.emit()" class="ml-3 underline">Try again</button>
        }
      </div>
    }
  `,
})
export class ErrorNote {
  readonly error = input<ApiError | null>(null);
  readonly retryable = input(false);
  readonly retry = output();
}
