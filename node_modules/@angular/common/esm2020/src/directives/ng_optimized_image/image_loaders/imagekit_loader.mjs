/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createImageLoader } from './image_loader';
/**
 * Function that generates an ImageLoader for ImageKit and turns it into an Angular provider.
 *
 * @param path Base URL of your ImageKit images
 * This URL should match one of the following formats:
 * https://ik.imagekit.io/myaccount
 * https://subdomain.mysite.com
 * @param options An object with extra configuration:
 * - `ensurePreconnect`: boolean flag indicating whether the NgOptimizedImage directive
 *                       should verify that there is a corresponding `<link rel="preconnect">`
 *                       present in the document's `<head>`.
 * @returns Set of providers to configure the ImageKit loader.
 *
 * @publicApi
 * @developerPreview
 */
export const provideImageKitLoader = createImageLoader(createImagekitUrl, ngDevMode ? ['https://ik.imagekit.io/mysite', 'https://subdomain.mysite.com'] : undefined);
export function createImagekitUrl(path, config) {
    // Example of an ImageKit image URL:
    // https://ik.imagekit.io/demo/tr:w-300,h-300/medium_cafe_B1iTdD0C.jpg
    let params = `tr:q-auto`; // applies the "auto quality" transformation
    if (config.width) {
        params += `,w-${config.width}`;
    }
    return `${path}/${params}/${config.src}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1hZ2VraXRfbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tbW9uL3NyYy9kaXJlY3RpdmVzL25nX29wdGltaXplZF9pbWFnZS9pbWFnZV9sb2FkZXJzL2ltYWdla2l0X2xvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsaUJBQWlCLEVBQW9CLE1BQU0sZ0JBQWdCLENBQUM7QUFFcEU7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsaUJBQWlCLENBQ2xELGlCQUFpQixFQUNqQixTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsK0JBQStCLEVBQUUsOEJBQThCLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7QUFFL0YsTUFBTSxVQUFVLGlCQUFpQixDQUFDLElBQVksRUFBRSxNQUF5QjtJQUN2RSxvQ0FBb0M7SUFDcEMsc0VBQXNFO0lBQ3RFLElBQUksTUFBTSxHQUFHLFdBQVcsQ0FBQyxDQUFFLDRDQUE0QztJQUN2RSxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUU7UUFDaEIsTUFBTSxJQUFJLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO0tBQ2hDO0lBQ0QsT0FBTyxHQUFHLElBQUksSUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzNDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtjcmVhdGVJbWFnZUxvYWRlciwgSW1hZ2VMb2FkZXJDb25maWd9IGZyb20gJy4vaW1hZ2VfbG9hZGVyJztcblxuLyoqXG4gKiBGdW5jdGlvbiB0aGF0IGdlbmVyYXRlcyBhbiBJbWFnZUxvYWRlciBmb3IgSW1hZ2VLaXQgYW5kIHR1cm5zIGl0IGludG8gYW4gQW5ndWxhciBwcm92aWRlci5cbiAqXG4gKiBAcGFyYW0gcGF0aCBCYXNlIFVSTCBvZiB5b3VyIEltYWdlS2l0IGltYWdlc1xuICogVGhpcyBVUkwgc2hvdWxkIG1hdGNoIG9uZSBvZiB0aGUgZm9sbG93aW5nIGZvcm1hdHM6XG4gKiBodHRwczovL2lrLmltYWdla2l0LmlvL215YWNjb3VudFxuICogaHR0cHM6Ly9zdWJkb21haW4ubXlzaXRlLmNvbVxuICogQHBhcmFtIG9wdGlvbnMgQW4gb2JqZWN0IHdpdGggZXh0cmEgY29uZmlndXJhdGlvbjpcbiAqIC0gYGVuc3VyZVByZWNvbm5lY3RgOiBib29sZWFuIGZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBOZ09wdGltaXplZEltYWdlIGRpcmVjdGl2ZVxuICogICAgICAgICAgICAgICAgICAgICAgIHNob3VsZCB2ZXJpZnkgdGhhdCB0aGVyZSBpcyBhIGNvcnJlc3BvbmRpbmcgYDxsaW5rIHJlbD1cInByZWNvbm5lY3RcIj5gXG4gKiAgICAgICAgICAgICAgICAgICAgICAgcHJlc2VudCBpbiB0aGUgZG9jdW1lbnQncyBgPGhlYWQ+YC5cbiAqIEByZXR1cm5zIFNldCBvZiBwcm92aWRlcnMgdG8gY29uZmlndXJlIHRoZSBJbWFnZUtpdCBsb2FkZXIuXG4gKlxuICogQHB1YmxpY0FwaVxuICogQGRldmVsb3BlclByZXZpZXdcbiAqL1xuZXhwb3J0IGNvbnN0IHByb3ZpZGVJbWFnZUtpdExvYWRlciA9IGNyZWF0ZUltYWdlTG9hZGVyKFxuICAgIGNyZWF0ZUltYWdla2l0VXJsLFxuICAgIG5nRGV2TW9kZSA/IFsnaHR0cHM6Ly9pay5pbWFnZWtpdC5pby9teXNpdGUnLCAnaHR0cHM6Ly9zdWJkb21haW4ubXlzaXRlLmNvbSddIDogdW5kZWZpbmVkKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUltYWdla2l0VXJsKHBhdGg6IHN0cmluZywgY29uZmlnOiBJbWFnZUxvYWRlckNvbmZpZykge1xuICAvLyBFeGFtcGxlIG9mIGFuIEltYWdlS2l0IGltYWdlIFVSTDpcbiAgLy8gaHR0cHM6Ly9pay5pbWFnZWtpdC5pby9kZW1vL3RyOnctMzAwLGgtMzAwL21lZGl1bV9jYWZlX0IxaVRkRDBDLmpwZ1xuICBsZXQgcGFyYW1zID0gYHRyOnEtYXV0b2A7ICAvLyBhcHBsaWVzIHRoZSBcImF1dG8gcXVhbGl0eVwiIHRyYW5zZm9ybWF0aW9uXG4gIGlmIChjb25maWcud2lkdGgpIHtcbiAgICBwYXJhbXMgKz0gYCx3LSR7Y29uZmlnLndpZHRofWA7XG4gIH1cbiAgcmV0dXJuIGAke3BhdGh9LyR7cGFyYW1zfS8ke2NvbmZpZy5zcmN9YDtcbn1cbiJdfQ==