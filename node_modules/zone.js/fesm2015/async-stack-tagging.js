'use strict';
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
 */
class AsyncStackTaggingZoneSpec {
    constructor(namePrefix, consoleAsyncStackTaggingImpl = console) {
        var _a;
        this.name = 'asyncStackTagging for ' + namePrefix;
        this.createTask = (_a = consoleAsyncStackTaggingImpl === null || consoleAsyncStackTaggingImpl === void 0 ? void 0 : consoleAsyncStackTaggingImpl.createTask) !== null && _a !== void 0 ? _a : (() => { });
    }
    onScheduleTask(delegate, _current, target, task) {
        task.consoleTask = this.createTask(`Zone - ${task.source || task.type}`);
        return delegate.scheduleTask(target, task);
    }
    onInvokeTask(delegate, _currentZone, targetZone, task, applyThis, applyArgs) {
        let ret;
        if (task.consoleTask) {
            ret = task.consoleTask.run(() => delegate.invokeTask(targetZone, task, applyThis, applyArgs));
        }
        else {
            ret = delegate.invokeTask(targetZone, task, applyThis, applyArgs);
        }
        return ret;
    }
}
// Export the class so that new instances can be created with proper
// constructor params.
Zone['AsyncStackTaggingZoneSpec'] = AsyncStackTaggingZoneSpec;
