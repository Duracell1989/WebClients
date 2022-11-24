import { ChangeEvent, Dispatch, SetStateAction } from 'react';

import { c } from 'ttag';

import { CryptoProxy } from '@proton/crypto';
import { BRAND_NAME, CONTACT_PGP_SCHEMES } from '@proton/shared/lib/constants';
import { getKnowledgeBaseUrl } from '@proton/shared/lib/helpers/url';
import { ContactPublicKeyModel, MailSettings } from '@proton/shared/lib/interfaces';
import { ArmoredKeyWithInfo } from '@proton/shared/lib/keys';
import { getIsValidForSending, getKeyEncryptionCapableStatus } from '@proton/shared/lib/keys/publicKeys';

import { Alert, Field, Info, Label, Row, Toggle } from '../../../components';
import { useNotifications } from '../../../hooks';
import SelectKeyFiles from '../../keys/shared/SelectKeyFiles';
import ContactKeysTable from './ContactKeysTable';
import ContactSchemeSelect from './ContactSchemeSelect';
import SignEmailsSelect from './SignEmailsSelect';

interface Props {
    model: ContactPublicKeyModel;
    setModel: Dispatch<SetStateAction<ContactPublicKeyModel | undefined>>;
    mailSettings?: MailSettings;
}

const ContactPGPSettings = ({ model, setModel, mailSettings }: Props) => {
    const { createNotification } = useNotifications();

    const hasApiKeys = !!model.publicKeys.apiKeys.length; // internal or WKD keys
    const hasPinnedKeys = !!model.publicKeys.pinnedKeys.length;

    const isPrimaryPinned = hasApiKeys && model.trustedFingerprints.has(model.publicKeys.apiKeys[0].getFingerprint());
    const noPinnedKeyCanSend =
        hasPinnedKeys &&
        !model.publicKeys.pinnedKeys.some((publicKey) => getIsValidForSending(publicKey.getFingerprint(), model));
    const noApiKeyCanSend =
        hasApiKeys &&
        !model.publicKeys.apiKeys.some((publicKey) => getIsValidForSending(publicKey.getFingerprint(), model));
    const askForPinning = hasPinnedKeys && hasApiKeys && (noPinnedKeyCanSend || !isPrimaryPinned);
    const hasCompromisedPinnedKeys = model.publicKeys.pinnedKeys.some((key) =>
        model.compromisedFingerprints.has(key.getFingerprint())
    );

    /**
     * Add / update keys to model
     * @param {Array<PublicKey>} keys
     */
    const handleUploadKeys = async (keys: ArmoredKeyWithInfo[]) => {
        if (!keys.length) {
            return createNotification({
                type: 'error',
                text: c('Error').t`Invalid public key file`,
            });
        }
        const pinnedKeys = [...model.publicKeys.pinnedKeys];
        const trustedFingerprints = new Set(model.trustedFingerprints);
        const encryptionCapableFingerprints = new Set(model.encryptionCapableFingerprints);

        await Promise.all(
            keys.map(async ({ keyIsPrivate, armoredKey }) => {
                if (keyIsPrivate) {
                    // do not allow to upload private keys
                    createNotification({
                        type: 'error',
                        text: c('Error').t`Invalid public key file`,
                    });
                    return;
                }
                const publicKey = await CryptoProxy.importPublicKey({ armoredKey });
                const fingerprint = publicKey.getFingerprint();
                const canEncrypt = await getKeyEncryptionCapableStatus(publicKey);
                if (canEncrypt) {
                    encryptionCapableFingerprints.add(fingerprint);
                }
                if (!trustedFingerprints.has(fingerprint)) {
                    trustedFingerprints.add(fingerprint);
                    pinnedKeys.push(publicKey);
                    return;
                }
                const indexFound = pinnedKeys.findIndex((publicKey) => publicKey.getFingerprint() === fingerprint);
                createNotification({ text: c('Info').t`Duplicate key updated`, type: 'warning' });
                pinnedKeys.splice(indexFound, 1, publicKey);
            })
        );

        setModel({
            ...model,
            publicKeys: { ...model.publicKeys, pinnedKeys },
            trustedFingerprints,
            encryptionCapableFingerprints,
        });
    };

    return (
        <>
            {!hasApiKeys && (
                <Alert className="mb1" learnMore={getKnowledgeBaseUrl('/how-to-use-pgp')}>
                    {c('Info')
                        .t`Setting up PGP allows you to send end-to-end encrypted emails with a non-${BRAND_NAME} user that uses a PGP compatible service.`}
                </Alert>
            )}
            {!!model.publicKeys.pinnedKeys.length && askForPinning && (
                <Alert className="mb1" type="error">{c('Info')
                    .t`Address Verification with Trusted Keys is enabled for this address. To be able to send to this address, first trust public keys that can be used for sending.`}</Alert>
            )}
            {hasCompromisedPinnedKeys && (
                <Alert className="mb1" type="warning">{c('Info')
                    .t`One or more of your trusted keys were marked "compromised" by their owner. We recommend that you "untrust" these keys.`}</Alert>
            )}
            {model.pgpAddressDisabled && (
                <Alert className="mb1" type="warning">{c('Info')
                    .t`This address is disabled. To be able to send to this address, the owner must first enable the address.`}</Alert>
            )}
            {hasApiKeys && !hasPinnedKeys && (
                <Alert className="mb1" learnMore={getKnowledgeBaseUrl('/address-verification')}>{c('Info')
                    .t`To use Address Verification, you must trust one or more available public keys, including the one you want to use for sending. This prevents the encryption keys from being faked.`}</Alert>
            )}
            {model.isPGPExternal && (noPinnedKeyCanSend || noApiKeyCanSend) && model.encrypt && (
                <Alert className="mb1" type="error" learnMore={getKnowledgeBaseUrl('/how-to-use-pgp')}>{c('Info')
                    .t`None of the uploaded keys are valid for encryption. To be able to send messages to this address, please upload a valid key or disable "Encrypt emails".`}</Alert>
            )}
            {model.isPGPExternal && (
                <>
                    <Row>
                        <Label htmlFor="encrypt-toggle">
                            {c('Label').t`Encrypt emails`}
                            <Info
                                className="ml0-5"
                                title={c('Tooltip')
                                    .t`Email encryption forces email signature to help authenticate your sent messages`}
                            />
                        </Label>
                        <Field className="pt0-5 flex flex-align-items-center">
                            <Toggle
                                className="mr0-5"
                                id="encrypt-toggle"
                                checked={model.encrypt}
                                disabled={!hasPinnedKeys && !hasApiKeys}
                                onChange={({ target }: ChangeEvent<HTMLInputElement>) =>
                                    setModel({
                                        ...model,
                                        encrypt: target.checked,
                                    })
                                }
                            />
                            <div className="flex-item-fluid">
                                {model.encrypt && c('Info').t`Emails are automatically signed`}
                            </div>
                        </Field>
                    </Row>
                    <Row>
                        <Label htmlFor="sign-select">
                            {c('Label').t`Sign emails`}
                            <Info
                                className="ml0-5"
                                title={c('Tooltip')
                                    .t`Digitally signing emails helps authenticating that messages are sent by you`}
                            />
                        </Label>
                        <Field>
                            <SignEmailsSelect
                                id="sign-select"
                                value={model.encrypt ? true : model.sign}
                                mailSettings={mailSettings}
                                disabled={model.encrypt}
                                onChange={(sign?: boolean) => setModel({ ...model, sign })}
                            />
                        </Field>
                    </Row>
                    <Row>
                        <Label>
                            {c('Label').t`PGP scheme`}
                            <Info
                                className="ml0-5"
                                title={c('Tooltip')
                                    .t`Select the PGP scheme to be used when signing or encrypting to a user. Note that PGP/Inline forces plain text messages`}
                            />
                        </Label>
                        <Field>
                            <ContactSchemeSelect
                                value={model.scheme}
                                mailSettings={mailSettings}
                                onChange={(scheme: CONTACT_PGP_SCHEMES) => setModel({ ...model, scheme })}
                            />
                        </Field>
                    </Row>
                </>
            )}
            <Row>
                <Label>
                    {c('Label').t`Public keys`}
                    <Info
                        className="ml0-5"
                        title={c('Tooltip')
                            .t`Upload a public key to enable sending end-to-end encrypted emails to this email`}
                    />
                </Label>
                <Field className="on-mobile-mt0-5">
                    {model.isPGPExternalWithoutWKDKeys && <SelectKeyFiles onUpload={handleUploadKeys} multiple />}
                </Field>
            </Row>
            {(hasApiKeys || hasPinnedKeys) && <ContactKeysTable model={model} setModel={setModel} />}
        </>
    );
};

export default ContactPGPSettings;
