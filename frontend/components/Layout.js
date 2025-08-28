import React from 'react';

export default function Layout({ title = 'Estimación PWAT', subtitle, actions, children }) {
  return (
    <>
      <header className="app-header">
        <div className="container row">
          <div className="app-title">
            <span className="logo">EP</span>
            <div>
              <div>{title}</div>
              {subtitle && <div style={{fontSize:12,opacity:.9}}>{subtitle}</div>}
            </div>
          </div>
          <div className="top-actions">{actions}</div>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
