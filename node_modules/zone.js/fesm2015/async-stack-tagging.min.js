"use strict";
/**
 * @license Angular v14.2.0-next.0
 * (c) 2010-2022 Google LLC. https://angular.io/
 * License: MIT
 */
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */class AsyncStackTaggingZoneSpec{constructor(e,n=console){var s;this.name="asyncStackTagging for "+e,this.createTask=null!==(s=null==n?void 0:n.createTask)&&void 0!==s?s:()=>{}}onScheduleTask(e,n,s,a){return a.consoleTask=this.createTask(`Zone - ${a.source||a.type}`),e.scheduleTask(s,a)}onInvokeTask(e,n,s,a,c,o){let k;return k=a.consoleTask?a.consoleTask.run((()=>e.invokeTask(s,a,c,o))):e.invokeTask(s,a,c,o),k}}Zone.AsyncStackTaggingZoneSpec=AsyncStackTaggingZoneSpec;