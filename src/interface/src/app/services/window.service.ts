import { isPlatformBrowser } from '@angular/common';
import {
  ClassProvider,
  FactoryProvider,
  InjectionToken,
  PLATFORM_ID,
} from '@angular/core';

/**
 * Window service
 * This service provides a way of getting the window object via a dependency injection
 * This allows to mock and provide the window object as well as applying best practices.
 *
 * How it works?
 * The main idea is to provide a token when using window instead of referencing window object directly.
 *
 * Avoid this:
 *
 * ```
 * export class YourComponent {
 *
 *   getAgent() {
 *     window.navigator.userAgent;
 *   }
 * }
 * ```
 *
 * Use this instead:
 *
 * ```
 * export class YourComponent {
 *
 *  constructor(@Inject(WINDOW) private window: Window)
 *
 *   getAgent() {
 *     this.window.navigator.userAgent;
 *   }
 * }
 * ```
 *
 *
 * There are several ways of implementing this idea, this one is taken from
 * https://brianflove.com/2018-01-11/angular-window-provider/
 *
 *
 * Testing
 *
 * You can provide a mock of the window object when declaring your test module
 *
 * await TestBed.configureTestingModule({
 *       declarations: [YourComponent],
 *       providers: [
 *         {
 *           provide: WINDOW,
 *           useValue: { YourWindowMock },
 *         },
 *       ],
 *     }).compileComponents();
 *
 *
 * And then get the window reference on your tests
 *
 * ```
 * const window = TestBed.inject(WINDOW);
 * ```
 */

/* Create a new injection token for injecting the window into a component. */
export const WINDOW = new InjectionToken<Window>('WindowToken');

/* Define abstract class for obtaining reference to the global window object. */
export abstract class WindowRef {
  get nativeWindow(): Window | Object {
    throw new Error('Not implemented.');
  }
}

/* Define class that implements the abstract class and returns the native window object. */
export class BrowserWindowRef extends WindowRef {
  constructor() {
    super();
  }

  override get nativeWindow(): Window | Object {
    return window;
  }
}

/* Create a factory function that returns the native window object. */
export function windowFactory(
  browserWindowRef: BrowserWindowRef,
  platformId: Object
): Window | Object {
  if (isPlatformBrowser(platformId)) {
    return browserWindowRef.nativeWindow;
  }
  return {};
}

/* Create an injectable provider for the WindowRef token that uses the BrowserWindowRef class. */
const browserWindowProvider: ClassProvider = {
  provide: WindowRef,
  useClass: BrowserWindowRef,
};

/* Create an injectable provider that uses the windowFactory function for returning the native window object. */
const windowProvider: FactoryProvider = {
  provide: WINDOW,
  useFactory: windowFactory,
  deps: [WindowRef, PLATFORM_ID],
};

/* Create an array of providers. */
export const WINDOW_PROVIDERS = [browserWindowProvider, windowProvider];
