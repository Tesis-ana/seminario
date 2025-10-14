import React from 'react';
import LanguageSelector from './LanguageSelector';

export default function Layout({
    title = 'Estimación PWAT',
    subtitle,
    actions,
    children,
}) {
    return (
        <>
            <header className='app-header'>
                <div className='container row'>
                    <div className='app-title'>
                        <span className='logo'>EP</span>
                        <div>
                            <div>{title}</div>
                            {subtitle && (
                                <div style={{ fontSize: 12, opacity: 0.9 }}>
                                    {subtitle}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className='top-actions'>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                            }}
                        >
                            <LanguageSelector />
                            {actions}
                        </div>
                    </div>
                </div>
            </header>
            <main className='container'>{children}</main>
        </>
    );
}
