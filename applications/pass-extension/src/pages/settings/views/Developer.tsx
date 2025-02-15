import { type VFC } from 'react';

import { Button } from '@proton/atoms/Button';
import Icon from '@proton/components/components/icon/Icon';
import { pageMessage, sendMessage } from '@proton/pass/extension/message';
import { WorkerMessageType } from '@proton/pass/types';

import { SettingsPanel } from '../component/SettingsPanel';
import { DropdownDebug } from '../component/debug/DropdownDebug';
import { NotificationDebug } from '../component/debug/NotificationDebug';

export const Developer: VFC = () => {
    return (
        <>
            <SettingsPanel title="Extension triggers">
                <Button
                    icon
                    shape="ghost"
                    className="w100 flex flex-align-items-center border-norm"
                    onClick={() =>
                        sendMessage(
                            pageMessage({
                                type: WorkerMessageType.DEBUG,
                                payload: { debug: 'update_trigger' },
                            })
                        )
                    }
                >
                    <Icon name="brand-chrome" className="mr-2" />
                    <span className="flex-item-fluid text-left">Trigger update</span>
                    <span className="text-xs color-weak">Triggers a fake update (keep popup opened)</span>
                </Button>
                <Button
                    icon
                    shape="ghost"
                    className="w100 flex flex-align-items-center border-norm"
                    onClick={() =>
                        sendMessage(
                            pageMessage({
                                type: WorkerMessageType.DEBUG,
                                payload: { debug: 'storage_full' },
                            })
                        )
                    }
                >
                    <Icon name="drive" className="mr-2" />
                    <span className="flex-item-fluid text-left">Trigger full disk</span>
                    <span className="text-xs color-weak">Triggers a fake disk full event (open popup after)</span>
                </Button>
            </SettingsPanel>
            <DropdownDebug />
            <NotificationDebug />
        </>
    );
};
