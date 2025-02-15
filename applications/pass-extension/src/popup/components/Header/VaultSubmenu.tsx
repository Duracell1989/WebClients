import { type VFC, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { c } from 'ttag';

import { Button } from '@proton/atoms';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleHeader,
    CollapsibleHeaderIconButton,
    Icon,
} from '@proton/components';
import { selectAllTrashedItems, selectAllVaultWithItemsCount, selectShare } from '@proton/pass/store';
import type { MaybeNull, ShareType, VaultShare } from '@proton/pass/types';
import type { VaultColor as VaultColorEnum } from '@proton/pass/types/protobuf/vault-v1';

import { DropdownMenuButton } from '../Dropdown/DropdownMenuButton';
import { VaultIcon, type VaultIconName } from '../Vault/VaultIcon';

type VaultOption = 'all' | 'trash' | VaultShare;

const getVaultOptionInfo = (
    vault: VaultOption
): { id: null | string; label: string; path: string; color?: VaultColorEnum; icon?: VaultIconName } => {
    switch (vault) {
        case 'all':
            return { id: null, label: c('Label').t`All vaults`, path: '/' };
        case 'trash':
            return { id: null, label: c('Label').t`Trash`, path: '/trash', icon: 'pass-trash' };
        default:
            return {
                id: vault.shareId,
                label: vault.content.name,
                path: `/share/${vault.shareId}`,
                color: vault.content.display.color,
                icon: vault.content.display.icon,
            };
    }
};

type VaultItemProps = {
    share?: VaultShare;
    label: string;
    count: number;
    selected: boolean;
    onSelect: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
};

const handleClickEvent = (handler: () => void) => (evt: React.MouseEvent) => {
    evt.preventDefault();
    evt.stopPropagation();
    handler();
};

export const VaultItem: VFC<VaultItemProps> = ({ share, label, count, selected, onSelect, onDelete, onEdit }) => {
    const withActions = onEdit || onDelete;

    return (
        <DropdownMenuButton
            onClick={() => onSelect()}
            isSelected={selected}
            label={label}
            extra={`(${count})`}
            icon={
                <VaultIcon
                    className="flex-item-noshrink mr-2"
                    size="medium"
                    color={share?.content.display.color}
                    icon={share?.content.display.icon}
                />
            }
            quickActions={
                withActions && (
                    <>
                        {onEdit && (
                            <DropdownMenuButton
                                label={c('Action').t`Edit vault`}
                                icon="pen"
                                onClick={onEdit ? (evt) => handleClickEvent(onEdit)(evt) : undefined}
                            />
                        )}
                        <DropdownMenuButton
                            disabled={!onDelete}
                            onClick={onDelete ? handleClickEvent(onDelete) : undefined}
                            label={c('Action').t`Delete vault`}
                            icon="trash"
                            danger
                        />
                    </>
                )
            }
        />
    );
};

type TrashItemProps = {
    handleRestoreTrash: () => void;
    handleEmptyTrash: () => void;
    onSelect: () => void;
    selected: boolean;
};
const TrashItem: VFC<TrashItemProps> = ({ onSelect, selected, handleRestoreTrash, handleEmptyTrash }) => {
    const count = useSelector(selectAllTrashedItems).length;

    return (
        <DropdownMenuButton
            label={getVaultOptionInfo('trash').label}
            icon="trash"
            extra={<span className="color-weak">({count})</span>}
            isSelected={selected}
            onClick={onSelect}
            quickActions={
                <>
                    <DropdownMenuButton
                        onClick={handleRestoreTrash}
                        label={c('Label').t`Restore all items`}
                        icon="arrow-up-and-left"
                    />

                    <DropdownMenuButton
                        onClick={handleEmptyTrash}
                        label={c('Label').t`Empty trash`}
                        icon="trash-cross"
                        danger
                    />
                </>
            }
        />
    );
};

export const VaultSubmenu: VFC<{
    selectedShareId: MaybeNull<string>;
    inTrash: boolean;
    handleVaultSelectClick: (shareId: MaybeNull<string>) => void;
    handleVaultDeleteClick: (vault: VaultShare) => void;
    handleVaultEditClick: (vault: VaultShare) => void;
    handleVaultCreateClick: () => void;
    handleRestoreTrash: () => void;
    handleEmptyTrash: () => void;
}> = ({
    selectedShareId,
    inTrash,
    handleVaultSelectClick,
    handleVaultDeleteClick,
    handleVaultEditClick,
    handleVaultCreateClick,
    handleRestoreTrash,
    handleEmptyTrash,
}) => {
    const history = useHistory();
    const vaults = useSelector(selectAllVaultWithItemsCount);
    const selectedVault = useSelector(selectShare<ShareType.Vault>(selectedShareId ?? ''));

    const totalCount = useMemo(() => vaults.reduce<number>((subtotal, { count }) => subtotal + count, 0), [vaults]);

    const handleSelect = (vault: VaultOption) => {
        const { id, path } = getVaultOptionInfo(vault);
        handleVaultSelectClick(id);
        history.push(path);
    };

    const selectedVaultOption = getVaultOptionInfo(selectedVault || (inTrash ? 'trash' : 'all'));

    return (
        <Collapsible>
            <CollapsibleHeader
                className="pl-4 pr-2"
                suffix={
                    <CollapsibleHeaderIconButton className="p-0" pill>
                        <Icon name="chevron-down" />
                    </CollapsibleHeaderIconButton>
                }
            >
                <span className="flex flex-align-items-center flex-nowrap gap-1">
                    <VaultIcon
                        className="mr-2"
                        size="medium"
                        color={selectedVaultOption?.color}
                        icon={selectedVaultOption?.icon}
                    />
                    <span className="block text-ellipsis">{selectedVaultOption.label}</span>
                </span>
            </CollapsibleHeader>
            <CollapsibleContent as="ul" className="unstyled">
                <hr className="dropdown-item-hr my-2 mx-4" aria-hidden="true" />

                <VaultItem
                    label={getVaultOptionInfo('all').label}
                    count={totalCount}
                    selected={!inTrash && selectedShareId === null}
                    onSelect={() => handleSelect('all')}
                />

                {vaults.map((vault) => {
                    const isPrimary = Boolean(vault.primary);
                    return (
                        <VaultItem
                            key={vault.shareId}
                            share={vault}
                            count={vault.count}
                            label={vault.content.name}
                            selected={!inTrash && selectedShareId === vault.shareId}
                            onSelect={() => handleSelect(vault)}
                            onDelete={!isPrimary ? () => handleVaultDeleteClick(vault) : undefined}
                            onEdit={() => handleVaultEditClick(vault)}
                        />
                    );
                })}

                <TrashItem
                    handleRestoreTrash={handleRestoreTrash}
                    handleEmptyTrash={handleEmptyTrash}
                    onSelect={() => handleSelect('trash')}
                    selected={inTrash}
                />

                <div className="px-2 mt-2 mb-4">
                    <Button className="w100" color="weak" shape="solid" onClick={handleVaultCreateClick}>
                        {c('Action').t`Create vault`}
                    </Button>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};
