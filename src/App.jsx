import React from 'react';
import './styles.css';

export function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <span className="brand-mark" aria-hidden="true">OS</span>
        <span>Operating Systems Lab</span>
        <span className="status-pill">SIMULATOR</span>
      </header>
      <section className="welcome-card" aria-labelledby="page-title">
        <p className="eyebrow">CPU SCHEDULING</p>
        <h1 id="page-title">Adaptive CPU Scheduling Simulator</h1>
        <p className="intro">Explore how scheduling algorithms shape process wait times, response times, and CPU utilization.</p>
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">↗</span>
          <div><strong>Simulator setup is ready</strong><p>Process controls and scheduling results will appear here.</p></div>
        </div>
        <p className="convention">Priority convention: lower number means higher priority.</p>
      </section>
      <footer>UNIVERSITY OPERATING SYSTEMS PROJECT <span>•</span> BROWSER BASED</footer>
    </main>
  );
}

