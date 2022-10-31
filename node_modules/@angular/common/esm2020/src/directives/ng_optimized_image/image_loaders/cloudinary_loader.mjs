/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createImageLoader } from './image_loader';
/**
 * Function that generates an ImageLoader for Cloudinary and turns it into an Angular provider.
 *
 * @param path Base URL of your Cloudinary images
 * This URL should match one of the following formats:
 * https://res.cloudinary.com/mysite
 * https://mysite.cloudinary.com
 * https://subdomain.mysite.com
 * @param options An object with extra configuration:
 * - `ensurePreconnect`: boolean flag indicating whether the NgOptimizedImage directive
 *                       should verify that there is a corresponding `<link rel="preconnect">`
 *                       present in the document's `<head>`.
 * @returns Set of providers to configure the Cloudinary loader.
 *
 * @publicApi
 * @developerPreview
 */
export const provideCloudinaryLoader = createImageLoader(createCloudinaryUrl, ngDevMode ?
    [
        'https://res.cloudinary.com/mysite', 'https://mysite.cloudinary.com',
        'https://subdomain.mysite.com'
    ] :
    undefined);
function createCloudinaryUrl(path, config) {
    // Cloudinary image URLformat:
    // https://cloudinary.com/documentation/image_transformations#transformation_url_structure
    // Example of a Cloudinary image URL:
    // https://res.cloudinary.com/mysite/image/upload/c_scale,f_auto,q_auto,w_600/marketing/tile-topics-m.png
    let params = `f_auto,q_auto`; // sets image format and quality to "auto"
    if (config.width) {
        params += `,w_${config.width}`;
    }
    return `${path}/image/upload/${params}/${config.src}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xvdWRpbmFyeV9sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21tb24vc3JjL2RpcmVjdGl2ZXMvbmdfb3B0aW1pemVkX2ltYWdlL2ltYWdlX2xvYWRlcnMvY2xvdWRpbmFyeV9sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGlCQUFpQixFQUFvQixNQUFNLGdCQUFnQixDQUFDO0FBRXBFOzs7Ozs7Ozs7Ozs7Ozs7O0dBZ0JHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsaUJBQWlCLENBQ3BELG1CQUFtQixFQUNuQixTQUFTLENBQUMsQ0FBQztJQUNQO1FBQ0UsbUNBQW1DLEVBQUUsK0JBQStCO1FBQ3BFLDhCQUE4QjtLQUMvQixDQUFDLENBQUM7SUFDSCxTQUFTLENBQUMsQ0FBQztBQUVuQixTQUFTLG1CQUFtQixDQUFDLElBQVksRUFBRSxNQUF5QjtJQUNsRSw4QkFBOEI7SUFDOUIsMEZBQTBGO0lBQzFGLHFDQUFxQztJQUNyQyx5R0FBeUc7SUFDekcsSUFBSSxNQUFNLEdBQUcsZUFBZSxDQUFDLENBQUUsMENBQTBDO0lBQ3pFLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRTtRQUNoQixNQUFNLElBQUksTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDaEM7SUFDRCxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsTUFBTSxJQUFJLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUN4RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Y3JlYXRlSW1hZ2VMb2FkZXIsIEltYWdlTG9hZGVyQ29uZmlnfSBmcm9tICcuL2ltYWdlX2xvYWRlcic7XG5cbi8qKlxuICogRnVuY3Rpb24gdGhhdCBnZW5lcmF0ZXMgYW4gSW1hZ2VMb2FkZXIgZm9yIENsb3VkaW5hcnkgYW5kIHR1cm5zIGl0IGludG8gYW4gQW5ndWxhciBwcm92aWRlci5cbiAqXG4gKiBAcGFyYW0gcGF0aCBCYXNlIFVSTCBvZiB5b3VyIENsb3VkaW5hcnkgaW1hZ2VzXG4gKiBUaGlzIFVSTCBzaG91bGQgbWF0Y2ggb25lIG9mIHRoZSBmb2xsb3dpbmcgZm9ybWF0czpcbiAqIGh0dHBzOi8vcmVzLmNsb3VkaW5hcnkuY29tL215c2l0ZVxuICogaHR0cHM6Ly9teXNpdGUuY2xvdWRpbmFyeS5jb21cbiAqIGh0dHBzOi8vc3ViZG9tYWluLm15c2l0ZS5jb21cbiAqIEBwYXJhbSBvcHRpb25zIEFuIG9iamVjdCB3aXRoIGV4dHJhIGNvbmZpZ3VyYXRpb246XG4gKiAtIGBlbnN1cmVQcmVjb25uZWN0YDogYm9vbGVhbiBmbGFnIGluZGljYXRpbmcgd2hldGhlciB0aGUgTmdPcHRpbWl6ZWRJbWFnZSBkaXJlY3RpdmVcbiAqICAgICAgICAgICAgICAgICAgICAgICBzaG91bGQgdmVyaWZ5IHRoYXQgdGhlcmUgaXMgYSBjb3JyZXNwb25kaW5nIGA8bGluayByZWw9XCJwcmVjb25uZWN0XCI+YFxuICogICAgICAgICAgICAgICAgICAgICAgIHByZXNlbnQgaW4gdGhlIGRvY3VtZW50J3MgYDxoZWFkPmAuXG4gKiBAcmV0dXJucyBTZXQgb2YgcHJvdmlkZXJzIHRvIGNvbmZpZ3VyZSB0aGUgQ2xvdWRpbmFyeSBsb2FkZXIuXG4gKlxuICogQHB1YmxpY0FwaVxuICogQGRldmVsb3BlclByZXZpZXdcbiAqL1xuZXhwb3J0IGNvbnN0IHByb3ZpZGVDbG91ZGluYXJ5TG9hZGVyID0gY3JlYXRlSW1hZ2VMb2FkZXIoXG4gICAgY3JlYXRlQ2xvdWRpbmFyeVVybCxcbiAgICBuZ0Rldk1vZGUgP1xuICAgICAgICBbXG4gICAgICAgICAgJ2h0dHBzOi8vcmVzLmNsb3VkaW5hcnkuY29tL215c2l0ZScsICdodHRwczovL215c2l0ZS5jbG91ZGluYXJ5LmNvbScsXG4gICAgICAgICAgJ2h0dHBzOi8vc3ViZG9tYWluLm15c2l0ZS5jb20nXG4gICAgICAgIF0gOlxuICAgICAgICB1bmRlZmluZWQpO1xuXG5mdW5jdGlvbiBjcmVhdGVDbG91ZGluYXJ5VXJsKHBhdGg6IHN0cmluZywgY29uZmlnOiBJbWFnZUxvYWRlckNvbmZpZykge1xuICAvLyBDbG91ZGluYXJ5IGltYWdlIFVSTGZvcm1hdDpcbiAgLy8gaHR0cHM6Ly9jbG91ZGluYXJ5LmNvbS9kb2N1bWVudGF0aW9uL2ltYWdlX3RyYW5zZm9ybWF0aW9ucyN0cmFuc2Zvcm1hdGlvbl91cmxfc3RydWN0dXJlXG4gIC8vIEV4YW1wbGUgb2YgYSBDbG91ZGluYXJ5IGltYWdlIFVSTDpcbiAgLy8gaHR0cHM6Ly9yZXMuY2xvdWRpbmFyeS5jb20vbXlzaXRlL2ltYWdlL3VwbG9hZC9jX3NjYWxlLGZfYXV0byxxX2F1dG8sd182MDAvbWFya2V0aW5nL3RpbGUtdG9waWNzLW0ucG5nXG4gIGxldCBwYXJhbXMgPSBgZl9hdXRvLHFfYXV0b2A7ICAvLyBzZXRzIGltYWdlIGZvcm1hdCBhbmQgcXVhbGl0eSB0byBcImF1dG9cIlxuICBpZiAoY29uZmlnLndpZHRoKSB7XG4gICAgcGFyYW1zICs9IGAsd18ke2NvbmZpZy53aWR0aH1gO1xuICB9XG4gIHJldHVybiBgJHtwYXRofS9pbWFnZS91cGxvYWQvJHtwYXJhbXN9LyR7Y29uZmlnLnNyY31gO1xufVxuIl19