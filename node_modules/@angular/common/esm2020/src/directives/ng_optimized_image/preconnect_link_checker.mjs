/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { inject, Injectable, InjectionToken, ɵformatRuntimeError as formatRuntimeError, ɵRuntimeError as RuntimeError } from '@angular/core';
import { DOCUMENT } from '../../dom_tokens';
import { assertDevMode } from './asserts';
import { imgDirectiveDetails } from './error_helper';
import { extractHostname, getUrl } from './url';
import * as i0 from "@angular/core";
// Set of origins that are always excluded from the preconnect checks.
const INTERNAL_PRECONNECT_CHECK_BLOCKLIST = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
/**
 * Multi-provider injection token to configure which origins should be excluded
 * from the preconnect checks. It can either be a single string or an array of strings
 * to represent a group of origins, for example:
 *
 * ```typescript
 *  {provide: PRECONNECT_CHECK_BLOCKLIST, multi: true, useValue: 'https://your-domain.com'}
 * ```
 *
 * or:
 *
 * ```typescript
 *  {provide: PRECONNECT_CHECK_BLOCKLIST, multi: true,
 *   useValue: ['https://your-domain-1.com', 'https://your-domain-2.com']}
 * ```
 *
 * @publicApi
 * @developerPreview
 */
export const PRECONNECT_CHECK_BLOCKLIST = new InjectionToken('PRECONNECT_CHECK_BLOCKLIST');
/**
 * Contains the logic to detect whether an image, marked with the "priority" attribute
 * has a corresponding `<link rel="preconnect">` tag in the `document.head`.
 *
 * Note: this is a dev-mode only class, which should not appear in prod bundles,
 * thus there is no `ngDevMode` use in the code.
 */
export class PreconnectLinkChecker {
    constructor() {
        this.document = inject(DOCUMENT);
        /**
         * Set of <link rel="preconnect"> tags found on this page.
         * The `null` value indicates that there was no DOM query operation performed.
         */
        this.preconnectLinks = null;
        /*
         * Keep track of all already seen origin URLs to avoid repeating the same check.
         */
        this.alreadySeen = new Set();
        this.window = null;
        this.blocklist = new Set(INTERNAL_PRECONNECT_CHECK_BLOCKLIST);
        assertDevMode('preconnect link checker');
        const win = this.document.defaultView;
        if (typeof win !== 'undefined') {
            this.window = win;
        }
        const blocklist = inject(PRECONNECT_CHECK_BLOCKLIST, { optional: true });
        if (blocklist) {
            this.populateBlocklist(blocklist);
        }
    }
    populateBlocklist(origins) {
        if (Array.isArray(origins)) {
            deepForEach(origins, origin => {
                this.blocklist.add(extractHostname(origin));
            });
        }
        else {
            throw new RuntimeError(2957 /* RuntimeErrorCode.INVALID_PRECONNECT_CHECK_BLOCKLIST */, `The blocklist for the preconnect check was not provided as an array. ` +
                `Check that the \`PRECONNECT_CHECK_BLOCKLIST\` token is configured as a \`multi: true\` provider.`);
        }
    }
    /**
     * Checks that a preconnect resource hint exists in the head fo rthe
     * given src.
     *
     * @param rewrittenSrc src formatted with loader
     * @param originalNgSrc ngSrc value
     */
    assertPreconnect(rewrittenSrc, originalNgSrc) {
        if (!this.window)
            return;
        const imgUrl = getUrl(rewrittenSrc, this.window);
        if (this.blocklist.has(imgUrl.hostname) || this.alreadySeen.has(imgUrl.origin))
            return;
        // Register this origin as seen, so we don't check it again later.
        this.alreadySeen.add(imgUrl.origin);
        if (!this.preconnectLinks) {
            // Note: we query for preconnect links only *once* and cache the results
            // for the entire lifespan of an application, since it's unlikely that the
            // list would change frequently. This allows to make sure there are no
            // performance implications of making extra DOM lookups for each image.
            this.preconnectLinks = this.queryPreconnectLinks();
        }
        if (!this.preconnectLinks.has(imgUrl.origin)) {
            console.warn(formatRuntimeError(2956 /* RuntimeErrorCode.PRIORITY_IMG_MISSING_PRECONNECT_TAG */, `${imgDirectiveDetails(originalNgSrc)} there is no preconnect tag present for this ` +
                `image. Preconnecting to the origin(s) that serve priority images ensures that these ` +
                `images are delivered as soon as possible. To fix this, please add the following ` +
                `element into the <head> of the document:\n` +
                `  <link rel="preconnect" href="${imgUrl.origin}">`));
        }
    }
    queryPreconnectLinks() {
        const preconnectUrls = new Set();
        const selector = 'link[rel=preconnect]';
        const links = Array.from(this.document.querySelectorAll(selector));
        for (let link of links) {
            const url = getUrl(link.href, this.window);
            preconnectUrls.add(url.origin);
        }
        return preconnectUrls;
    }
    ngOnDestroy() {
        this.preconnectLinks?.clear();
        this.alreadySeen.clear();
    }
}
PreconnectLinkChecker.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.7", ngImport: i0, type: PreconnectLinkChecker, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
PreconnectLinkChecker.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.2.7", ngImport: i0, type: PreconnectLinkChecker, providedIn: 'root' });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.7", ngImport: i0, type: PreconnectLinkChecker, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: function () { return []; } });
/**
 * Invokes a callback for each element in the array. Also invokes a callback
 * recursively for each nested array.
 */
function deepForEach(input, fn) {
    for (let value of input) {
        Array.isArray(value) ? deepForEach(value, fn) : fn(value);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlY29ubmVjdF9saW5rX2NoZWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21tb24vc3JjL2RpcmVjdGl2ZXMvbmdfb3B0aW1pemVkX2ltYWdlL3ByZWNvbm5lY3RfbGlua19jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBRSxtQkFBbUIsSUFBSSxrQkFBa0IsRUFBRSxhQUFhLElBQUksWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBRTNJLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUcxQyxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ3hDLE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25ELE9BQU8sRUFBQyxlQUFlLEVBQUUsTUFBTSxFQUFDLE1BQU0sT0FBTyxDQUFDOztBQUU5QyxzRUFBc0U7QUFDdEUsTUFBTSxtQ0FBbUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUUzRjs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQ25DLElBQUksY0FBYyxDQUF5Qiw0QkFBNEIsQ0FBQyxDQUFDO0FBRTdFOzs7Ozs7R0FNRztBQUVILE1BQU0sT0FBTyxxQkFBcUI7SUFrQmhDO1FBakJRLGFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFcEM7OztXQUdHO1FBQ0ssb0JBQWUsR0FBcUIsSUFBSSxDQUFDO1FBRWpEOztXQUVHO1FBQ0ssZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBRWhDLFdBQU0sR0FBZ0IsSUFBSSxDQUFDO1FBRTNC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QyxlQUFlLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDOUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUMzQixDQUFDOzs2SEE1RlUscUJBQXFCO2lJQUFyQixxQkFBcUIsY0FEVCxNQUFNO3NHQUNsQixxQkFBcUI7a0JBRGpDLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFDOztBQWdHaEM7OztHQUdHO0FBQ0gsU0FBUyxXQUFXLENBQUksS0FBa0IsRUFBRSxFQUFzQjtJQUNoRSxLQUFLLElBQUksS0FBSyxJQUFJLEtBQUssRUFBRTtRQUN2QixLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDM0Q7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7aW5qZWN0LCBJbmplY3RhYmxlLCBJbmplY3Rpb25Ub2tlbiwgybVmb3JtYXRSdW50aW1lRXJyb3IgYXMgZm9ybWF0UnVudGltZUVycm9yLCDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge0RPQ1VNRU5UfSBmcm9tICcuLi8uLi9kb21fdG9rZW5zJztcbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi4vLi4vZXJyb3JzJztcblxuaW1wb3J0IHthc3NlcnREZXZNb2RlfSBmcm9tICcuL2Fzc2VydHMnO1xuaW1wb3J0IHtpbWdEaXJlY3RpdmVEZXRhaWxzfSBmcm9tICcuL2Vycm9yX2hlbHBlcic7XG5pbXBvcnQge2V4dHJhY3RIb3N0bmFtZSwgZ2V0VXJsfSBmcm9tICcuL3VybCc7XG5cbi8vIFNldCBvZiBvcmlnaW5zIHRoYXQgYXJlIGFsd2F5cyBleGNsdWRlZCBmcm9tIHRoZSBwcmVjb25uZWN0IGNoZWNrcy5cbmNvbnN0IElOVEVSTkFMX1BSRUNPTk5FQ1RfQ0hFQ0tfQkxPQ0tMSVNUID0gbmV3IFNldChbJ2xvY2FsaG9zdCcsICcxMjcuMC4wLjEnLCAnMC4wLjAuMCddKTtcblxuLyoqXG4gKiBNdWx0aS1wcm92aWRlciBpbmplY3Rpb24gdG9rZW4gdG8gY29uZmlndXJlIHdoaWNoIG9yaWdpbnMgc2hvdWxkIGJlIGV4Y2x1ZGVkXG4gKiBmcm9tIHRoZSBwcmVjb25uZWN0IGNoZWNrcy4gSXQgY2FuIGVpdGhlciBiZSBhIHNpbmdsZSBzdHJpbmcgb3IgYW4gYXJyYXkgb2Ygc3RyaW5nc1xuICogdG8gcmVwcmVzZW50IGEgZ3JvdXAgb2Ygb3JpZ2lucywgZm9yIGV4YW1wbGU6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogIHtwcm92aWRlOiBQUkVDT05ORUNUX0NIRUNLX0JMT0NLTElTVCwgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiAnaHR0cHM6Ly95b3VyLWRvbWFpbi5jb20nfVxuICogYGBgXG4gKlxuICogb3I6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogIHtwcm92aWRlOiBQUkVDT05ORUNUX0NIRUNLX0JMT0NLTElTVCwgbXVsdGk6IHRydWUsXG4gKiAgIHVzZVZhbHVlOiBbJ2h0dHBzOi8veW91ci1kb21haW4tMS5jb20nLCAnaHR0cHM6Ly95b3VyLWRvbWFpbi0yLmNvbSddfVxuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICogQGRldmVsb3BlclByZXZpZXdcbiAqL1xuZXhwb3J0IGNvbnN0IFBSRUNPTk5FQ1RfQ0hFQ0tfQkxPQ0tMSVNUID1cbiAgICBuZXcgSW5qZWN0aW9uVG9rZW48QXJyYXk8c3RyaW5nfHN0cmluZ1tdPj4oJ1BSRUNPTk5FQ1RfQ0hFQ0tfQkxPQ0tMSVNUJyk7XG5cbi8qKlxuICogQ29udGFpbnMgdGhlIGxvZ2ljIHRvIGRldGVjdCB3aGV0aGVyIGFuIGltYWdlLCBtYXJrZWQgd2l0aCB0aGUgXCJwcmlvcml0eVwiIGF0dHJpYnV0ZVxuICogaGFzIGEgY29ycmVzcG9uZGluZyBgPGxpbmsgcmVsPVwicHJlY29ubmVjdFwiPmAgdGFnIGluIHRoZSBgZG9jdW1lbnQuaGVhZGAuXG4gKlxuICogTm90ZTogdGhpcyBpcyBhIGRldi1tb2RlIG9ubHkgY2xhc3MsIHdoaWNoIHNob3VsZCBub3QgYXBwZWFyIGluIHByb2QgYnVuZGxlcyxcbiAqIHRodXMgdGhlcmUgaXMgbm8gYG5nRGV2TW9kZWAgdXNlIGluIHRoZSBjb2RlLlxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnfSlcbmV4cG9ydCBjbGFzcyBQcmVjb25uZWN0TGlua0NoZWNrZXIge1xuICBwcml2YXRlIGRvY3VtZW50ID0gaW5qZWN0KERPQ1VNRU5UKTtcblxuICAvKipcbiAgICogU2V0IG9mIDxsaW5rIHJlbD1cInByZWNvbm5lY3RcIj4gdGFncyBmb3VuZCBvbiB0aGlzIHBhZ2UuXG4gICAqIFRoZSBgbnVsbGAgdmFsdWUgaW5kaWNhdGVzIHRoYXQgdGhlcmUgd2FzIG5vIERPTSBxdWVyeSBvcGVyYXRpb24gcGVyZm9ybWVkLlxuICAgKi9cbiAgcHJpdmF0ZSBwcmVjb25uZWN0TGlua3M6IFNldDxzdHJpbmc+fG51bGwgPSBudWxsO1xuXG4gIC8qXG4gICAqIEtlZXAgdHJhY2sgb2YgYWxsIGFscmVhZHkgc2VlbiBvcmlnaW4gVVJMcyB0byBhdm9pZCByZXBlYXRpbmcgdGhlIHNhbWUgY2hlY2suXG4gICAqL1xuICBwcml2YXRlIGFscmVhZHlTZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgcHJpdmF0ZSB3aW5kb3c6IFdpbmRvd3xudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGJsb2NrbGlzdCA9IG5ldyBTZXQ8c3RyaW5nPihJTlRFUk5BTF9QUkVDT05ORUNUX0NIRUNLX0JMT0NLTElTVCk7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgYXNzZXJ0RGV2TW9kZSgncHJlY29ubmVjdCBsaW5rIGNoZWNrZXInKTtcbiAgICBjb25zdCB3aW4gPSB0aGlzLmRvY3VtZW50LmRlZmF1bHRWaWV3O1xuICAgIGlmICh0eXBlb2Ygd2luICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy53aW5kb3cgPSB3aW47XG4gICAgfVxuICAgIGNvbnN0IGJsb2NrbGlzdCA9IGluamVjdChQUkVDT05ORUNUX0NIRUNLX0JMT0NLTElTVCwge29wdGlvbmFsOiB0cnVlfSk7XG4gICAgaWYgKGJsb2NrbGlzdCkge1xuICAgICAgdGhpcy5wb3B1bGF0ZUJsb2NrbGlzdChibG9ja2xpc3QpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcG9wdWxhdGVCbG9ja2xpc3Qob3JpZ2luczogQXJyYXk8c3RyaW5nfHN0cmluZ1tdPikge1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9yaWdpbnMpKSB7XG4gICAgICBkZWVwRm9yRWFjaChvcmlnaW5zLCBvcmlnaW4gPT4ge1xuICAgICAgICB0aGlzLmJsb2NrbGlzdC5hZGQoZXh0cmFjdEhvc3RuYW1lKG9yaWdpbikpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5JTlZBTElEX1BSRUNPTk5FQ1RfQ0hFQ0tfQkxPQ0tMSVNULFxuICAgICAgICAgIGBUaGUgYmxvY2tsaXN0IGZvciB0aGUgcHJlY29ubmVjdCBjaGVjayB3YXMgbm90IHByb3ZpZGVkIGFzIGFuIGFycmF5LiBgICtcbiAgICAgICAgICAgICAgYENoZWNrIHRoYXQgdGhlIFxcYFBSRUNPTk5FQ1RfQ0hFQ0tfQkxPQ0tMSVNUXFxgIHRva2VuIGlzIGNvbmZpZ3VyZWQgYXMgYSBcXGBtdWx0aTogdHJ1ZVxcYCBwcm92aWRlci5gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoYXQgYSBwcmVjb25uZWN0IHJlc291cmNlIGhpbnQgZXhpc3RzIGluIHRoZSBoZWFkIGZvIHJ0aGVcbiAgICogZ2l2ZW4gc3JjLlxuICAgKlxuICAgKiBAcGFyYW0gcmV3cml0dGVuU3JjIHNyYyBmb3JtYXR0ZWQgd2l0aCBsb2FkZXJcbiAgICogQHBhcmFtIG9yaWdpbmFsTmdTcmMgbmdTcmMgdmFsdWVcbiAgICovXG4gIGFzc2VydFByZWNvbm5lY3QocmV3cml0dGVuU3JjOiBzdHJpbmcsIG9yaWdpbmFsTmdTcmM6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy53aW5kb3cpIHJldHVybjtcblxuICAgIGNvbnN0IGltZ1VybCA9IGdldFVybChyZXdyaXR0ZW5TcmMsIHRoaXMud2luZG93KTtcbiAgICBpZiAodGhpcy5ibG9ja2xpc3QuaGFzKGltZ1VybC5ob3N0bmFtZSkgfHwgdGhpcy5hbHJlYWR5U2Vlbi5oYXMoaW1nVXJsLm9yaWdpbikpIHJldHVybjtcblxuICAgIC8vIFJlZ2lzdGVyIHRoaXMgb3JpZ2luIGFzIHNlZW4sIHNvIHdlIGRvbid0IGNoZWNrIGl0IGFnYWluIGxhdGVyLlxuICAgIHRoaXMuYWxyZWFkeVNlZW4uYWRkKGltZ1VybC5vcmlnaW4pO1xuXG4gICAgaWYgKCF0aGlzLnByZWNvbm5lY3RMaW5rcykge1xuICAgICAgLy8gTm90ZTogd2UgcXVlcnkgZm9yIHByZWNvbm5lY3QgbGlua3Mgb25seSAqb25jZSogYW5kIGNhY2hlIHRoZSByZXN1bHRzXG4gICAgICAvLyBmb3IgdGhlIGVudGlyZSBsaWZlc3BhbiBvZiBhbiBhcHBsaWNhdGlvbiwgc2luY2UgaXQncyB1bmxpa2VseSB0aGF0IHRoZVxuICAgICAgLy8gbGlzdCB3b3VsZCBjaGFuZ2UgZnJlcXVlbnRseS4gVGhpcyBhbGxvd3MgdG8gbWFrZSBzdXJlIHRoZXJlIGFyZSBub1xuICAgICAgLy8gcGVyZm9ybWFuY2UgaW1wbGljYXRpb25zIG9mIG1ha2luZyBleHRyYSBET00gbG9va3VwcyBmb3IgZWFjaCBpbWFnZS5cbiAgICAgIHRoaXMucHJlY29ubmVjdExpbmtzID0gdGhpcy5xdWVyeVByZWNvbm5lY3RMaW5rcygpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5wcmVjb25uZWN0TGlua3MuaGFzKGltZ1VybC5vcmlnaW4pKSB7XG4gICAgICBjb25zb2xlLndhcm4oZm9ybWF0UnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuUFJJT1JJVFlfSU1HX01JU1NJTkdfUFJFQ09OTkVDVF9UQUcsXG4gICAgICAgICAgYCR7aW1nRGlyZWN0aXZlRGV0YWlscyhvcmlnaW5hbE5nU3JjKX0gdGhlcmUgaXMgbm8gcHJlY29ubmVjdCB0YWcgcHJlc2VudCBmb3IgdGhpcyBgICtcbiAgICAgICAgICAgICAgYGltYWdlLiBQcmVjb25uZWN0aW5nIHRvIHRoZSBvcmlnaW4ocykgdGhhdCBzZXJ2ZSBwcmlvcml0eSBpbWFnZXMgZW5zdXJlcyB0aGF0IHRoZXNlIGAgK1xuICAgICAgICAgICAgICBgaW1hZ2VzIGFyZSBkZWxpdmVyZWQgYXMgc29vbiBhcyBwb3NzaWJsZS4gVG8gZml4IHRoaXMsIHBsZWFzZSBhZGQgdGhlIGZvbGxvd2luZyBgICtcbiAgICAgICAgICAgICAgYGVsZW1lbnQgaW50byB0aGUgPGhlYWQ+IG9mIHRoZSBkb2N1bWVudDpcXG5gICtcbiAgICAgICAgICAgICAgYCAgPGxpbmsgcmVsPVwicHJlY29ubmVjdFwiIGhyZWY9XCIke2ltZ1VybC5vcmlnaW59XCI+YCkpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcXVlcnlQcmVjb25uZWN0TGlua3MoKTogU2V0PHN0cmluZz4ge1xuICAgIGNvbnN0IHByZWNvbm5lY3RVcmxzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3Qgc2VsZWN0b3IgPSAnbGlua1tyZWw9cHJlY29ubmVjdF0nO1xuICAgIGNvbnN0IGxpbmtzOiBIVE1MTGlua0VsZW1lbnRbXSA9IEFycmF5LmZyb20odGhpcy5kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG4gICAgZm9yIChsZXQgbGluayBvZiBsaW5rcykge1xuICAgICAgY29uc3QgdXJsID0gZ2V0VXJsKGxpbmsuaHJlZiwgdGhpcy53aW5kb3chKTtcbiAgICAgIHByZWNvbm5lY3RVcmxzLmFkZCh1cmwub3JpZ2luKTtcbiAgICB9XG4gICAgcmV0dXJuIHByZWNvbm5lY3RVcmxzO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5wcmVjb25uZWN0TGlua3M/LmNsZWFyKCk7XG4gICAgdGhpcy5hbHJlYWR5U2Vlbi5jbGVhcigpO1xuICB9XG59XG5cbi8qKlxuICogSW52b2tlcyBhIGNhbGxiYWNrIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGFycmF5LiBBbHNvIGludm9rZXMgYSBjYWxsYmFja1xuICogcmVjdXJzaXZlbHkgZm9yIGVhY2ggbmVzdGVkIGFycmF5LlxuICovXG5mdW5jdGlvbiBkZWVwRm9yRWFjaDxUPihpbnB1dDogKFR8YW55W10pW10sIGZuOiAodmFsdWU6IFQpID0+IHZvaWQpOiB2b2lkIHtcbiAgZm9yIChsZXQgdmFsdWUgb2YgaW5wdXQpIHtcbiAgICBBcnJheS5pc0FycmF5KHZhbHVlKSA/IGRlZXBGb3JFYWNoKHZhbHVlLCBmbikgOiBmbih2YWx1ZSk7XG4gIH1cbn1cbiJdfQ==