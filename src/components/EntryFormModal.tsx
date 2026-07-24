import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    TextInput,
    Dropdown,
    NumberInput,
    TextArea,
    Button,
    Modal,
    InlineNotification,
    Tag,
} from '@carbon/react';
import { ACTIVITY_TYPE_KEYS } from '../services/claims';

interface Props {
    mode: 'add' | 'edit';
    values: {
        date: string;
        activityType: string;
        customer: string;
        workItem: string;
        hours: number;
        comment: string;
    };
    setField: (field: string, value: string | number) => void;
    saving: boolean;
    error: string | null;
    onSubmit: () => void;
    onClose: () => void;
    recentEntries?: Array<{ customer: string; workItem: string }>;
}

export default function EntryFormModal({
    mode,
    values,
    setField,
    saving,
    error,
    onSubmit,
    onClose,
    recentEntries = [],
}: Props) {
    const { t } = useTranslation();

    const activityTypeItems = ACTIVITY_TYPE_KEYS.map((key) => ({
        id: key,
        text: t(`entry.activityTypes.${key}`, key),
    }));

    const selectRecent = (entry: { customer: string; workItem: string }) => {
        setField('customer', entry.customer);
        setField('workItem', entry.workItem);
    };

    return (
        <Modal
            open
            modalHeading={mode === 'add' ? t('entry.addTitle') : t('entry.editTitle')}
            primaryButtonText={t('app.save')}
            secondaryButtonText={t('app.cancel')}
            primaryButtonDisabled={saving}
            onRequestClose={onClose}
            onRequestSubmit={onSubmit}
            size="sm"
        >
            <div className="entry-form">
                {error && (
                    <InlineNotification
                        kind="error"
                        title={t('app.error')}
                        subtitle={error}
                        lowContrast
                        onClose={() => { }}
                    />
                )}

                {recentEntries.length > 0 && (
                    <div className="entry-form__recent">
                        <span className="entry-form__recent-label">{t('entry.quickSelect')}:</span>
                        <div className="entry-form__recent-pills">
                            {recentEntries.slice(0, 8).map((e, i) => (
                                <Tag
                                    key={i}
                                    type="cool-gray"
                                    size="sm"
                                    filter
                                    onClick={() => selectRecent(e)}
                                >
                                    {e.customer} / {e.workItem}
                                </Tag>
                            ))}
                        </div>
                    </div>
                )}

                <TextInput
                    id="entry-date"
                    labelText={t('entry.date')}
                    type="date"
                    value={values.date}
                    onChange={(e) => setField('date', e.target.value)}
                />

                <Dropdown
                    id="entry-activity"
                    titleText={t('entry.activityType')}
                    label={t(`entry.activityTypes.${values.activityType}`, values.activityType)}
                    items={activityTypeItems}
                    selectedItem={activityTypeItems.find((i) => i.id === values.activityType)}
                    itemToString={(item) => (item ? item.text : '')}
                    onChange={({ selectedItem }) => {
                        if (selectedItem) setField('activityType', selectedItem.id);
                    }}
                />

                <TextInput
                    id="entry-customer"
                    labelText={t('entry.customer')}
                    value={values.customer}
                    onChange={(e) => setField('customer', e.target.value)}
                />

                <TextInput
                    id="entry-workitem"
                    labelText={t('entry.workItem')}
                    value={values.workItem}
                    onChange={(e) => setField('workItem', e.target.value)}
                />

                <NumberInput
                    id="entry-hours"
                    label={t('entry.hours')}
                    value={values.hours}
                    min={0}
                    max={24}
                    step={0.5}
                    onChange={(_, { value }) => setField('hours', value)}
                />

                <TextArea
                    id="entry-comment"
                    labelText={t('entry.comment')}
                    value={values.comment}
                    onChange={(e) => setField('comment', e.target.value)}
                />
            </div>
        </Modal>
    );
}
