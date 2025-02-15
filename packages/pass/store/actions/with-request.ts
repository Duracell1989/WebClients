import type { AnyAction } from 'redux';

import { merge } from '@proton/pass/utils/object';

export type RequestType = 'start' | 'failure' | 'success';
export type NamespaceSeperator = typeof NS_SEPERATOR;
export type NamespacedRequest = `${string}${NamespaceSeperator}${string}`;
export type RequestOptions<T extends string = string> = { type: RequestType; id: T };
export type WithRequest<T = AnyAction, R extends string = string> = T & { meta: { request: RequestOptions<R> } };

const NS_SEPERATOR = '::' as const;

export const withRequestNamespace =
    (request: string) =>
    (ns: string): NamespacedRequest =>
        `${request}${NS_SEPERATOR}${ns}`;

export const getRequestNamespace = (req: NamespacedRequest) => req.split(NS_SEPERATOR)[1];

export const isActionWithRequest = <T extends AnyAction>(action?: T): action is WithRequest<T> =>
    (action as any)?.meta?.request !== undefined;

const withRequest =
    <U extends string>(request: RequestOptions<U>) =>
    <T extends object>(action: T): WithRequest<T, U> =>
        merge(action, { meta: { request } });

export default withRequest;
