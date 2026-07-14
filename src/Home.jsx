import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { supabase } from './supabaseClient';
import { COLORS } from './theme';
import { GlobalStyles, useDragReorder } from './ui';
import Contacts from './Providers';
import TrackedItems from './TrackedItems';
import Notes from './Notes';

const DEFAULT_TABS = [
  { key: 'contacts', label: 'Contacts' },
  { key: 'tracked', label: 'Tracked Items' },
  { key: 'notes', label: 'Notes' },
];

// Tab order is a per-device UI preference, not app data -- localStorage is
// enough, no need for a database table.
function tabOrderKey(userId) {
  return `manifest-tab-order-${userId}`;
}

function loadTabOrder(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(tabOrderKey(userId)));
    if (!Array.isArray(saved)) return DEFAULT_TABS;
    const byKey = Object.fromEntries(DEFAULT_TABS.map((t) => [t.key, t]));
    const ordered = saved.map((k) => byKey[k]).filter(Boolean);
    const missing = DEFAULT_TABS.filter((t) => !saved.includes(t.key));
    return [...ordered, ...missing];
  } catch {
    return DEFAULT_TABS;
  }
}

function saveTabOrder(userId, tabs) {
  localStorage.setItem(tabOrderKey(userId), JSON.stringify(tabs.map((t) => t.key)));
}

export default function Home({ session }) {
  const [tab, setTab] = useState('contacts');
  const [tabs, setTabs] = useState(() => loadTabOrder(session.user.id));

  const { handleDragStart, handleDragOver, handleDrop } = useDragReorder(
    tabs,
    setTabs,
    (next) => saveTabOrder(session.user.id, next)
  );

  const signOut = () => supabase.auth.signOut();

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', fontFamily: "'Inter', ui-sans-serif, system-ui", color: COLORS.ink }}>
      <GlobalStyles />

      <header style={{ borderBottom: `1px solid ${COLORS.line}`, padding: '24px 24px 0', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, color: COLORS.inkDim, fontSize: 13, wordBreak: 'break-all' }}>{session.user.email}</p>
          <button
            onClick={signOut}
            title="Sign out"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, padding: '6px 12px', borderRadius: 6, border: `1px solid ${COLORS.line}`, background: 'transparent', color: COLORS.inkDim }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
        <nav style={{ display: 'flex', gap: 4, marginTop: 18 }}>
          {tabs.map((t, i) => (
            <button
              key={t.key}
              draggable
              onDragStart={handleDragStart(i)}
              onDragOver={handleDragOver}
              onDrop={handleDrop(i)}
              onClick={() => setTab(t.key)}
              title="Drag to reorder"
              style={{
                fontSize: 13.5, fontWeight: 600, padding: '9px 4px', marginRight: 18, cursor: 'pointer',
                background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? COLORS.accent : 'transparent'}`,
                color: tab === t.key ? COLORS.ink : COLORS.inkDim,
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '22px 24px 80px' }}>
        {tab === 'contacts' && <Contacts session={session} />}
        {tab === 'tracked' && <TrackedItems session={session} />}
        {tab === 'notes' && <Notes session={session} />}
      </main>
    </div>
  );
}
