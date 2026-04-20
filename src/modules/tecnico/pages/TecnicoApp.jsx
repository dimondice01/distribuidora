import React, { useState } from 'react';
import { useTenant } from '../../../contexts/TenantContext'; // Correct path to TenantContext
import TecnicoLogin from './TecnicoLogin';
import TecnicoDashboard from './TecnicoDashboard';
import ServicioForm from './ServicioForm';

export default function TecnicoApp() {
    const { user } = useTenant();
    const [view, setView] = useState('dashboard'); // dashboard or form
    const [selectedClient, setSelectedClient] = useState(null);

    if (!user) {
        return <TecnicoLogin />;
    }

    const handleSelectClient = (clientId) => {
        setSelectedClient(clientId);
        setView('form');
    };

    const handleBack = () => {
        setSelectedClient(null);
        setView('dashboard');
    };

    return (
        <div className="min-h-screen bg-slate-50 relative selection:bg-orange-500/30 font-sans">
            {view === 'dashboard' ? (
                <TecnicoDashboard onSelectClient={handleSelectClient} />
            ) : (
                <ServicioForm clientId={selectedClient} onBack={handleBack} />
            )}
        </div>
    );
}
