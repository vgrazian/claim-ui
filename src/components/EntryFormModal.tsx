import React, { useState } from 'react';
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

export interface PresalesOpp {
    /** Opportunity number / label (the comment field value) */
    opportunity: string;
    /** Hours already logged against this opportunity */
    hoursLogged: number;
    /** Hours remaining before the 24h warning threshold */
    hoursRemaining: number;
}

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
    onClearError: () => void;
    onSubmit: () => void;
    onClose: () => void;
    recentTemplates?: RecentTemplate[];
    /** Presales opportunities with remaining capacity (total logged < 24h) */
    presalesOpportunities?: PresalesOpp[];
}

export default function EntryFormModal({
    mode,
    values,
    setField,
    saving,
    error,
    onClearError,
    onSubmit,
    onClose,
    recentTemplates = [],
    presalesOpportunities = [],
}: Props) {
    const { t } = useTranslation();
    const [showOppPicker, setShowOppPicker] = useState(false);
    const [customOpp, setCustomOpp] = useState('');

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
    };

    // Clicking the Presales button sets the type fields then opens the opp picker
    const handlePresalesClick = () => {
        setField('activityType', 'presales'); // also triggers auto-customer in hook
        setField('workItem', 'M.00556');
        setField('hours', 8);
        setCustomOpp('');
        setShowOppPicker(true);
    };

    // Confirm a selection from the picker
    const confirmOpp = (opp: string) => {
        const trimmed = opp.trim();
        if (trimmed) setField('comment', trimmed);
        setShowOppPicker(false);
    };

    // Derive autocomplete values from templates
    const uniqueCustomers = [...new Set(recentTemplates.map((e) => e.customer))].filter(Boolean);
    const uniqueWorkItems = [...new Set(recentTemplates.map((e) => e.workItem))].filter(Boolean);

    return (
        <>
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
                            onClose={onClearError}
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
                        <Button kind="tertiary" size="sm" onClick={handlePresalesClick}>
                            {t('entry.activityTypes.presales')}
                        </Button>
                    </div>

                    {recentTemplates.length > 0 && (() => {
                        // Client-side safety net: exclude presales templates that
                        // have already reached the 24h cap, even if the server
                        // somehow included them.
                        const safeTemplates = recentTemplates.filter((t) => {
                            if (t.activityTypeName !== 'presales') return true;
                            return t.hours < 24;
                        });
                        if (safeTemplates.length === 0) return null;
                        return (
                            <div className="entry-form__templates">
                                <span className="entry-form__templates-label">{t('entry.quickSelect')}:</span>
                                <div className="entry-form__templates-grid">
                                    {safeTemplates.slice(0, 8).map((tmpl, i) => (
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
                                                {tmpl.activityTypeName === 'presales'
                                                    ? (tmpl.comment || tmpl.customer || '—')
                                                    : `${tmpl.customer || '—'} / ${tmpl.workItem || '—'}`}
                                            </span>
                                            <span className="entry-form__template-hours">{tmpl.hours}h</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

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

            {/* Opportunity picker — shown as a separate modal on top */}
            {showOppPicker && (
                <Modal
                    open
                    modalHeading={t('entry.presalesPickerTitle')}
                    primaryButtonText={t('app.save')}
                    secondaryButtonText={t('app.cancel')}
                    primaryButtonDisabled={!customOpp.trim() && !values.comment}
                    onRequestClose={() => setShowOppPicker(false)}
                    onRequestSubmit={() => confirmOpp(customOpp || values.comment)}
                    size="sm"
                >
                    <div className="entry-form__opp-picker">
                        {presalesOpportunities.length > 0 && (
                            <>
                                <p className="entry-form__opp-picker-hint">{t('entry.presalesAvailable')}:</p>
                                <div className="entry-form__presales-opp-list">
                                    {presalesOpportunities.map((opp) => {
                                        const isActive = (customOpp || values.comment) === opp.opportunity;
                                        return (
                                            <button
                                                key={opp.opportunity}
                                                type="button"
                                                className={`entry-form__presales-opp-btn${isActive ? ' entry-form__presales-opp-btn--active' : ''}`}
                                                onClick={() => setCustomOpp(opp.opportunity)}
                                            >
                                                <span className="entry-form__presales-opp-name">{opp.opportunity}</span>
                                                <Tag type={isActive ? 'gray' : 'blue'} size="sm">
                                                    {opp.hoursLogged}h / 24h
                                                </Tag>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="entry-form__opp-picker-or">{t('entry.presalesPickerOr')}</p>
                            </>
                        )}
                        <TextInput
                            id="opp-custom"
                            labelText={t('entry.presalesPickerCustom')}
                            placeholder={t('entry.presalesPickerPlaceholder')}
                            value={customOpp}
                            onChange={(e) => setCustomOpp(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && customOpp.trim()) confirmOpp(customOpp);
                            }}
                        />
                    </div>
                </Modal>
            )}
        </>
    );
}
