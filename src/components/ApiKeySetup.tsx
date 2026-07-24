import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Modal,
    TextInput,
    Button,
    InlineNotification,
    InlineLoading,
    Tile,
} from '@carbon/react';
import { useSettings } from '../context/SettingsContext';

export default function ApiKeySetup() {
    const { t } = useTranslation();
    const { setApiKey } = useSettings();
    const [key, setKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSave = async () => {
        if (!key.trim()) {
            setError('Please enter an API key.');
            return;
        }
        setSaving(true);
        setError(null);
        const result = await setApiKey(key.trim());
        setSaving(false);
        if (result.success) {
            setSuccess(true);
            setTimeout(() => window.location.reload(), 1500);
        } else {
            setError(result.error || 'Failed to save API key.');
        }
    };

    if (success) {
        return (
            <div className="page-container">
                <Tile className="app-error-tile">
                    <h3>API Key Saved</h3>
                    <p>Your API key has been validated and saved. Reloading...</p>
                    <InlineLoading description="Reloading..." />
                </Tile>
            </div>
        );
    }

    return (
        <div className="page-container">
            <Tile className="api-setup-tile">
                <h3>Welcome to Claim UI</h3>
                <p className="api-setup-desc">
                    To get started, enter your Monday.com API key. You can find it at{' '}
                    <strong>your-account.monday.com &gt; Admin &gt; Integrations &gt; API</strong>.
                </p>
                <p className="api-setup-desc">
                    The key will be stored in the same config file used by the claim TUI app.
                </p>

                {error && (
                    <InlineNotification
                        kind="error"
                        title="Error"
                        subtitle={error}
                        lowContrast
                        onClose={() => setError(null)}
                    />
                )}

                <div className="api-setup-form">
                    <TextInput
                        id="api-key-input"
                        labelText="Monday.com API Key"
                        placeholder="Enter your API key..."
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        type="password"
                        disabled={saving}
                    />
                    <Button kind="primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Validating...' : 'Save & Connect'}
                    </Button>
                </div>
            </Tile>
        </div>
    );
}
