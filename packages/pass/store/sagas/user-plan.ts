import { put, select, takeLeading } from 'redux-saga/effects';

import { SessionLockStatus } from '../../types';
import { setUserPlan, wakeupSuccess } from '../actions';
import type { UserPlanState } from '../reducers';
import type { State, WorkerRootSagaOptions } from '../types';
import { getUserPlan } from './workers/user';

/* Try to sync the user plan on each wakeup success */
function* syncPlan({ getAuth }: WorkerRootSagaOptions) {
    try {
        const loggedIn = getAuth().hasSession();
        const locked = getAuth().getLockStatus() === SessionLockStatus.LOCKED;

        if (loggedIn && !locked) {
            const { user }: State = yield select();
            const plan: UserPlanState = yield getUserPlan(user);
            yield plan !== user.plan && put(setUserPlan(plan));
        }
    } catch (_) {}
}

export default function* watcher(options: WorkerRootSagaOptions) {
    yield takeLeading(wakeupSuccess.match, syncPlan, options);
}
