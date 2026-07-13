import React, { useEffect, useState } from 'react';
import { Plus, X, Phone, MapPin, Trash2, LogOut } from 'lucide-react';
import { supabase } from './supabaseClient';
import { COLORS } from './theme';

const BLANK = { name: '', specialty: '', location: '', phone: '', notes: '' };

export default function Providers({ session }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null); // provider id, or 'new'
  const [draft, setDraft] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('providers')
        .select('*')
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (fetchError) setError(fetchError.message);
      else setProviders(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const startAdd = () => {
    setDraft(BLANK);
    setEditingId('new');
  };

  const startEdit = (p) => {
    setDraft({ name: p.name, specialty: p.specialty, location: p.location, phone: p.phone, notes: p.notes });
    setEditingId(p.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(BLANK);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      if (editingId === 'new') {
        const { data, error: insertError } = await supabase
          .from('providers')
          .insert({ ...draft, user_id: session.user.id })
          .select()
          .single();
        if (insertError) throw insertError;
        setProviders((prev) => [...prev, data]);
      } else {
        const { data, error: updateError } = await supabase
          .from('providers')
          .update(draft)
          .eq('id', editingId)
          .select()
          .single();
        if (updateError) throw updateError;
        setProviders((prev) => prev.map((p) => (p.id === editingId ? data : p)));
      }
      cancelEdit();
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    const prev = providers;
    setProviders((p) => p.filter((x) => x.id !== id));
    const { error: deleteError } = await supabase.from('providers').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      setProviders(prev);
    }
    if (editingId === id) cancelEdit();
  };

  const signOut = () => supabase.auth.signOut();

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', fontFamily: "'Inter', ui-sans-serif, system-ui", color: COLORS.ink }}>
      <style>{`
        * { box-sizing: border-box; }
        input, textarea { font-family: inherit; }
        input::placeholder, textarea::placeholder { color: ${COLORS.inkFaint}; }
        button { cursor: pointer; font-family: inherit; }
        .cm-input {
          background: ${COLORS.bg}; border: 1px solid ${COLORS.line}; color: ${COLORS.ink};
          border-radius: 6px; padding: 7px 10px; font-size: 13px; width: 100%;
        }
        .cm-input:focus { outline: none; border-color: ${COLORS.accent}; }
        .cm-row:hover .cm-del { opacity: 1; }
      `}</style>

      <header style={{ borderBottom: `1px solid ${COLORS.line}`, padding: '24px 24px 18px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 650, letterSpacing: '-0.01em' }}>Providers</h1>
          <button
            onClick={signOut}
            title="Sign out"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, padding: '6px 12px', borderRadius: 6, border: `1px solid ${COLORS.line}`, background: 'transparent', color: COLORS.inkDim }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
        <p style={{ margin: '6px 0 0', color: COLORS.inkDim, fontSize: 13, wordBreak: 'break-all' }}>{session.user.email}</p>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '22px 24px 80px' }}>
        {error && <p style={{ color: COLORS.clay, fontSize: 13, marginTop: 0 }}>{error}</p>}

        {loading ? (
          <p style={{ color: COLORS.inkDim, fontSize: 13 }}>Loading…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {providers.length === 0 && editingId !== 'new' && (
              <p style={{ color: COLORS.inkFaint, fontSize: 13 }}>No providers yet.</p>
            )}
            {providers.map((p) =>
              editingId === p.id ? (
                <ProviderForm
                  key={p.id}
                  draft={draft}
                  setDraft={setDraft}
                  onSave={save}
                  onCancel={cancelEdit}
                  onRemove={() => remove(p.id)}
                  saving={saving}
                />
              ) : (
                <ProviderRow key={p.id} provider={p} onEdit={() => startEdit(p)} onRemove={() => remove(p.id)} />
              )
            )}
            {editingId === 'new' && (
              <ProviderForm
                draft={draft}
                setDraft={setDraft}
                onSave={save}
                onCancel={cancelEdit}
                saving={saving}
              />
            )}
          </div>
        )}

        {editingId === null && (
          <button
            onClick={startAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: `1px dashed ${COLORS.line}`, color: COLORS.inkDim, borderRadius: 8, padding: '11px 16px', fontSize: 13.5, width: '100%', justifyContent: 'center', marginTop: 14 }}
          >
            <Plus size={15} /> Add provider
          </button>
        )}
      </main>
    </div>
  );
}

function ProviderRow({ provider, onEdit, onRemove }) {
  return (
    <div
      className="cm-row"
      onClick={onEdit}
      style={{ display: 'flex', alignItems: 'baseline', gap: 10, background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 7, padding: '10px 12px', cursor: 'pointer', flexWrap: 'wrap' }}
    >
      <span style={{ fontSize: 13.5, fontWeight: 550 }}>{provider.name || 'Unnamed'}</span>
      {provider.specialty && <span style={{ fontSize: 12, color: COLORS.inkDim }}>{provider.specialty}</span>}
      {provider.location && (
        <span style={{ fontSize: 11.5, color: COLORS.inkFaint, display: 'flex', alignItems: 'center', gap: 3 }}>
          <MapPin size={10} /> {provider.location}
        </span>
      )}
      <span style={{ flex: 1 }} />
      {provider.phone && (
        <span style={{ fontSize: 12, color: COLORS.inkDim, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Phone size={11} /> {provider.phone}
        </span>
      )}
      <button
        className="cm-del"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{ opacity: 0, transition: 'opacity .12s', background: 'none', border: 'none', color: COLORS.inkFaint, padding: 4 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ProviderForm({ draft, setDraft, onSave, onCancel, onRemove, saving }) {
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  return (
    <div style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.accent}`, borderRadius: 7, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Row2>
        <Field label="Name"><input className="cm-input" value={draft.name} onChange={set('name')} placeholder="Dr. Jane Smith" autoFocus /></Field>
        <Field label="Specialty"><input className="cm-input" value={draft.specialty} onChange={set('specialty')} placeholder="Oncologist, Primary care…" /></Field>
      </Row2>
      <Row2>
        <Field label="Location"><input className="cm-input" value={draft.location} onChange={set('location')} placeholder="Clinic / hospital name" /></Field>
        <Field label="Phone"><input className="cm-input" value={draft.phone} onChange={set('phone')} placeholder="(000) 000-0000" /></Field>
      </Row2>
      <Field label="Notes"><textarea className="cm-input" rows={2} value={draft.notes} onChange={set('notes')} placeholder="Office hours, portal login, etc." /></Field>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        {onRemove ? (
          <button onClick={onRemove} style={{ background: 'none', border: 'none', color: COLORS.clay, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Trash2 size={13} /> Delete
          </button>
        ) : <span />}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ background: 'none', border: `1px solid ${COLORS.line}`, color: COLORS.inkDim, fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 6 }}>
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{ background: COLORS.accent, border: 'none', color: '#0E1416', fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 6, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, color: COLORS.inkDim }}>
      {label}
      {children}
    </label>
  );
}

function Row2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{children}</div>;
}
