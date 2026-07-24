import React from 'react';
import { Tile } from '@carbon/react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="page-container">
                    <Tile className="app-error-tile">
                        <h3>Something went wrong</h3>
                        <p>{this.state.error?.message || 'An unexpected error occurred.'}</p>
                        <button
                            className="cds--btn cds--btn--primary"
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            style={{ marginTop: '1rem' }}
                        >
                            Reload
                        </button>
                    </Tile>
                </div>
            );
        }
        return this.props.children;
    }
}
