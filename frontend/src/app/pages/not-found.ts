import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  template: `<p class="py-24 text-center text-zinc-500">Page not found. <a routerLink="/" class="text-accent underline">Back to the catalog</a></p>`,
  imports: [RouterLink],
})
export class NotFoundPage {}
