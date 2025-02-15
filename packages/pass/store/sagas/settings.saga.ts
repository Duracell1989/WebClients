import { put, select, takeLeading } from 'redux-saga/effects';

import { partialMerge } from '@proton/pass/utils/object';

import { settingEditFailure, settingEditIntent, settingEditSuccess } from '../actions/creators/settings';
import type { WithSenderAction } from '../actions/with-receiver';
import { getRequestNamespace } from '../actions/with-request';
import type { ProxiedSettings } from '../reducers/settings';
import { selectProxiedSettings } from '../selectors/settings';
import type { WorkerRootSagaOptions } from '../types';

function* settingsEditWorker(
    { onSettingUpdate }: WorkerRootSagaOptions,
    { meta, payload }: WithSenderAction<ReturnType<typeof settingEditIntent>>
) {
    const namespace = getRequestNamespace(meta.request.id);

    try {
        const settings: ProxiedSettings = yield select(selectProxiedSettings);
        /* `disallowedDomains` update should act as a setter */
        if ('disallowedDomains' in payload) settings.disallowedDomains = {};

        yield onSettingUpdate?.(partialMerge(settings, payload));
        yield put(settingEditSuccess(namespace, payload, meta.sender?.endpoint));
    } catch (e) {
        yield put(settingEditFailure(namespace, e, meta.sender?.endpoint));
    }
}

export default function* watcher(options: WorkerRootSagaOptions) {
    yield takeLeading(settingEditIntent.match, settingsEditWorker, options);
}
