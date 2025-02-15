/* This file defines the core client code for the browser extension's content script.
 * The client sets up the context, manages the state and provides functions to start and destroy
 * the content script service. It listens to messages from the background script,
 * and registers or unregisters the content script service based on state changes / errors.
 *
 * Sequences:
 * - Normal start: client is registered with the background script and starts normally.
 * - Unregister request: background requests to unregister -> client destroys itself.
 * - Successful recovery: extension context change with successful recovery (i.e., port disconnected).
 * - Failed recovery: extension context change with failed recovery -> destroy.
 * - Error during setup: client encounters an error during setup -> destroy.
 */
import { contentScriptMessage, sendMessage } from '@proton/pass/extension/message';
import type { ProxiedSettings } from '@proton/pass/store/reducers/settings';
import { WorkerMessageType, type WorkerMessageWithSender, type WorkerState } from '@proton/pass/types';
import { createListenerStore } from '@proton/pass/utils/listener';
import { logger } from '@proton/pass/utils/logger';
import { workerReady } from '@proton/pass/utils/worker';

import { ExtensionContext, type ExtensionContextType, setupExtensionContext } from '../../shared/extension';
import { CSContext } from '../context/context';
import { createContentScriptContext } from '../context/factory';
import { DOMCleanUp } from '../injections/cleanup';

import '../injections/styles/injection.scss';

export const createContentScriptClient = (scriptId: string, mainFrame: boolean) => {
    const listeners = createListenerStore();

    const context = createContentScriptContext({
        scriptId,
        mainFrame,
        destroy: (options) => {
            if (context.getState().active) {
                logger.info(`[ContentScript::${scriptId}] destroying.. [reason: "${options.reason}"]`);
                listeners.removeAll();
                context.setState({ active: false });
                context.service.formManager.destroy();
                context.service.iframe.destroy();

                CSContext.clear();
                DOMCleanUp();

                ExtensionContext.read()?.destroy();
            }
        },
    });

    const reconciliate = async () => {
        context.service.iframe.reset();
        context.service.formManager.sync();

        const { status, loggedIn } = context.getState();

        if (!loggedIn) context.service.autofill.reset();
        else if (workerReady(status)) await context.service.autofill.reconciliate();
    };

    const onWorkerStateChange = (workerState: WorkerState) => {
        if (context.getState().active) {
            context.setState(workerState);
            void reconciliate();
        }
    };

    const onSettingsChange = (settings: ProxiedSettings) => {
        if (context.getState().active) {
            context.setSettings(settings);
            void reconciliate();
        }
    };

    const onPortMessage = async (message: WorkerMessageWithSender): Promise<void> => {
        if (message.sender === 'background') {
            switch (message.type) {
                case WorkerMessageType.UNLOAD_CONTENT_SCRIPT:
                    return context.destroy({ reason: 'unload script' });
                case WorkerMessageType.WORKER_STATUS:
                    return onWorkerStateChange(message.payload.state);
                case WorkerMessageType.SETTINGS_UPDATE:
                    return onSettingsChange(message.payload);
                case WorkerMessageType.AUTOFILL_SYNC:
                    return context.service.autofill.sync(message.payload);
            }
        }
    };

    const handleStart = async ({ tabId, port }: ExtensionContextType) => {
        const res = await sendMessage(
            contentScriptMessage({
                type: WorkerMessageType.WORKER_WAKEUP,
                payload: { endpoint: 'contentscript', tabId },
            })
        );

        if (res.type === 'success' && context.getState().active) {
            logger.debug(`[ContentScript::${scriptId}] Worker status resolved "${res.status}"`);
            context.setState({ loggedIn: res.loggedIn, status: res.status, UID: res.UID });
            context.setSettings(res.settings);
            await reconciliate();

            /* if the user has disabled every injection setting or added the current
             * domain to the pause list we can safely destroy the content-script context */
            const enable = Object.values(context.getFeatures()).reduce((pass, feat) => pass || feat);
            if (!enable) return context.destroy({ reason: 'injection settings' });

            /* if we're in an iframe and the initial detection should not
             * be triggered : destroy this content-script service */
            if (!mainFrame) return context.destroy({ reason: 'subframe discarded' });

            port.onMessage.addListener(onPortMessage);
            context.service.formManager.observe();

            const didDetect = await context.service.formManager.detect({ reason: 'InitialLoad', flush: true });
            if (!didDetect) await context.service.autosave.reconciliate();
        }
    };

    const start = async () => {
        try {
            const extensionContext = await setupExtensionContext({
                endpoint: 'contentscript',
                onDisconnect: () => {
                    const recycle = context.getState().active;
                    if (!recycle) context.destroy({ reason: 'port disconnected' });
                    return { recycle };
                },
                onRecycle: handleStart,
            });

            logger.debug(`[ContentScript::${scriptId}] Starting content-script service`);
            return await handleStart(extensionContext);
        } catch (e) {
            logger.debug(`[ContentScript::${scriptId}] Setup error`, e);
            context.destroy({ reason: 'setup error' });
        }
    };

    return { start, destroy: context.destroy };
};

export type ContentScriptClientService = ReturnType<typeof createContentScriptClient>;
