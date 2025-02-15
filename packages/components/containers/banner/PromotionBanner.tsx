import * as React from 'react';
import { ReactNode } from 'react';

import { c } from 'ttag';

import { Button } from '@proton/atoms/Button';
import { Icon } from '@proton/components/';
import clsx from '@proton/utils/clsx';

import './PromotionBanner.scss';

interface Props {
    className?: string;
    rounded?: boolean;
    icon?: ReactNode;
    description?: ReactNode;
    cta?: ReactNode;
    loading?: boolean;
    hasDismissAction?: boolean;
    contentCentered?: boolean;
    mode?: 'row' | 'banner';
    onClose?: () => void;
    ['data-testid']?: string;
}

const PromotionBanner = ({
    className,
    rounded = false,
    loading = false,
    contentCentered = true,
    mode = 'row',
    description,
    cta,
    icon,
    hasDismissAction = false,
    onClose,
    'data-testid': dataTestId,
}: Props) => {
    const handleClose = () => {
        onClose?.();
    };

    return (
        <div
            className={clsx(
                'flex flex-nowrap flex-item-noshrink bg-promotion relative',
                contentCentered && 'text-center on-tablet-text-left p-0-5',
                rounded && 'rounded',
                className
            )}
            data-testid={dataTestId}
        >
            <div
                className={clsx(
                    'inline-flex mx-auto flex-nowrap flex-align-items-center ',
                    (() => {
                        if (contentCentered) {
                            return 'm-0.5 px-2';
                        }
                        if (mode === 'banner') {
                            return 'm-3 pl-4 w100';
                        }
                        if (mode === 'row') {
                            return 'm-2 pl-4 w100';
                        }
                    })(),
                    loading && 'w33'
                )}
            >
                {loading ? (
                    <span
                        className={clsx('bg-promotion-loading', contentCentered ? 'w100' : 'w33')}
                        data-testid="promotion-banner:loading"
                    />
                ) : (
                    <>
                        {icon && <div className="flex-item-noshrink mr-2">{icon}</div>}
                        {description && (
                            <div className={clsx('bg-promotion-text', !contentCentered && 'flex-item-fluid')}>
                                {description}
                            </div>
                        )}
                        {cta && <div className="flex-item-noshrink ml-2 max-w50 text-right">{cta}</div>}
                    </>
                )}
            </div>
            {hasDismissAction && !loading && (
                <Button
                    onClick={handleClose}
                    icon
                    size="small"
                    color="weak"
                    shape="ghost"
                    className="ml-2 mr-1 my-auto"
                    title={c('Action').t`Close`}
                >
                    <Icon name="cross" alt={c('Action').t`Close`} />
                </Button>
            )}
        </div>
    );
};

export default PromotionBanner;
