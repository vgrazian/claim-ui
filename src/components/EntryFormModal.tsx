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
import type { RecentTemplate } from '../services/api';

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
    recentTemplates?: RecentTemplate[];
}

export default function EntryFormModal({
    mode,
    values,
    setField,
    saving,
    error,
    onSubmit,
    onClose,
    recentTemplates = [],
}: Props) {
    const { t } = useTranslation();

    const activityTypeItems = ACTIVITY_TYPE_KEYS.map((key) => ({
        id: key,
        text: t(`entry.activityTypes.${key}`, key),
    }));

    // Fill entire form from a template
    const applyTemplate = (tmpl: RecentTemplate) => {
        setField('activityType', tmpl.activityTypeName);
        setField('customer', tmpl.customer);
        setField('workItem', tmpl.workItem);
        setField('hours', tmpl.hours);
        if (tmpl.comment) setField('comment', tmpl.comment);
    };

    const quickPreset = (type: string, wi = 'M.00556') => {
        setField('activityType', type);
        setField('workItem', wi);
        setField('hours', 8);
        setField('customer', type === 'vacation' ? '' : '');
    };

    // Derive autocomplete values from templates
    const uniqueCustomers = [...new Set(recentTemplates.map((e) => e.customer))].filter(Boolean);
    const uniqueWorkItems = [...new Set(recentTemplates.map((e) => e.workItem))].filter(Boolean);

    return (
        <Modal
            open
            modalHeading={mode === 'add' ? t('entry.addTitle') : t('entry.editTitle')}
            primaryButtonText={t('app.save')}
            secondaryButtonText={t('app.cancel')}
            primaryButtonDisabled={saving}
            onRequestClose={onClose}
            onRequestSubmit={onSubmit}
            size="md"
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

                <div className="entry-form__quick-actions">
                    <Button kind="tertiary" size="sm" onClick={() => quickPreset('vacation')}>
                        Vacation
                    </Button>
                    <Button kind="tertiary" size="sm" onClick={() => quickPreset('l104')}>
                        L.104
                    </Button>
                    <Button kind="tertiary" size="sm" onClick={() => quickPreset('holiday')}>
                        Holiday
                    </Button>
                </div>

                {recentTemplates.length > 0 && (
                    <div className="entry-form__templates">
                        <span className="entry-form__templates-label">{t('entry.quickSelect')}:</span>
                        <div className="entry-form__templates-grid">
                            {recentTemplates.slice(0, 8).map((tmpl, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className="entry-form__template-card"
                                    onClick={() => applyTemplate(tmpl)}
                                    title={tmpl.comment || undefined}
                                >
                                    <Tag type="green" size="sm">
                                        {t(`entry.activityTypes.${tmpl.activityTypeName}`, tmpl.activityTypeName)}
                                    </Tag>
                                    <span className="entry-form__template-text">
                                        {tmpl.customer || '—'} / {tmpl.workItem || '—'}
                                    </span>
                                    <span className="entry-form__template-hours">{tmpl.hours}h</span>
                                </button>
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
                    list="recent-customers"
                />
                <datalist id="recent-customers">
                    {uniqueCustomers.map((c) => (
                        <option key={c} value={c} />
                    ))}
                </datalist>

                <TextInput
                    id="entry-workitem"
                    labelText={t('entry.workItem')}
                    value={values.workItem}
                    onChange={(e) => setField('workItem', e.target.value)}
                    list="recent-workitems"
                />
                <datalist id="recent-workitems">
                    {uniqueWorkItems.map((w) => (
                        <option key={w} value={w} />
                    ))}
                </datalist>

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
