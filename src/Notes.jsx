import React, { useEffect, useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import { COLORS } from './theme';
import { Field, useDragReorder, persistOrder, DragHandle } from './ui';

const BLANK = { title: '', body: '', entry_date: '' };

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Notes({ session }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null); // note id, or 'new'
  const [draft, setDraft] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      if (fetchError) setError(fetchError.message);
      else setNotes(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const startAdd = () => {
    setDraft(BLANK);
    setEditingId('new');
  };

  const startEdit = (n) => {
    setDraft({ title: n.title, body: n.body, entry_date: n.entry_date || '' });
    setEditingId(n.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(BLANK);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = { ...draft, entry_date: draft.entry_date || null };
      if (editingId === 'new') {
        const { data, error: insertError } = await supabase
          .from('notes')
          .insert({ ...payload, user_id: session.user.id, sort_order: notes.length })
          .select()
          .single();
        if (insertError) throw insertError;
        setNotes((prev) => [...prev, data]);
      } else {
        const { data, error: updateError } = await supabase
          .from('notes')
          .update(payload)
          .eq('id', editingId)
          .select()
          .single();
        if (updateError) throw updateError;
        setNotes((prev) => prev.map((n) => (n.id === editingId ? data : n)));
      }
      cancelEdit();
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    const prev = notes;
    setNotes((n) => n.filter((x) => x.id !== id));
    const { error: deleteError } = await supabase.from('notes').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      setNotes(prev);
    }
    if (editingId === id) cancelEdit();
  };

  const { handleDragStart, handleDragOver, handleDrop } = useDragReorder(
    notes,
    setNotes,
    (next) => persistOrder(supabase, 'notes', next)
  );

  return (
    <div>
      {error && <p style={{ color: COLORS.clay, fontSize: 13, marginTop: 0 }}>{error}</p>}

      {loading ? (
        <p style={{ color: COLORS.inkDim, fontSize: 13 }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notes.length === 0 && editingId !== 'new' && (
            <p style={{ color: COLORS.inkFaint, fontSize: 13 }}>No notes yet.</p>
          )}
          {editingId === 'new' && (
            <NoteForm draft={draft} setDraft={setDraft} onSave={save} onCancel={cancelEdit} saving={saving} />
          )}
          {notes.map((n, i) =>
            editingId === n.id ? (
              <NoteForm
                key={n.id}
                draft={draft}
                setDraft={setDraft}
                onSave={save}
                onCancel={cancelEdit}
                onRemove={() => remove(n.id)}
                saving={saving}
              />
            ) : (
              <NoteRow
                key={n.id}
                note={n}
                onEdit={() => startEdit(n)}
                onRemove={() => remove(n.id)}
                onDragStart={handleDragStart(i)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(i)}
              />
            )
          )}
        </div>
      )}

      {editingId === null && (
        <button
          onClick={startAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: `1px dashed ${COLORS.line}`, color: COLORS.inkDim, borderRadius: 8, padding: '11px 16px', fontSize: 13.5, width: '100%', justifyContent: 'center', marginTop: 14 }}
        >
          <Plus size={15} /> Add note
        </button>
      )}
    </div>
  );
}

function NoteRow({ note, onEdit, onRemove, onDragStart, onDragOver, onDrop }) {
  const preview = (note.body || '').replace(/\s+/g, ' ').trim();
  return (
    <div
      className="cm-row"
      onClick={onEdit}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 7, padding: '10px 12px', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <DragHandle onDragStart={onDragStart} />
        <span style={{ fontSize: 13.5, fontWeight: 550, flex: 1, minWidth: 0 }}>{note.title || 'Untitled'}</span>
        {note.entry_date && (
          <span style={{ fontSize: 12, color: COLORS.inkDim, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{formatDate(note.entry_date)}</span>
        )}
        <button
          className="cm-del"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{ opacity: 0, transition: 'opacity .12s', background: 'none', border: 'none', color: COLORS.inkFaint, padding: 4, flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      </div>
      {preview && (
        <p style={{ margin: '4px 0 0', fontSize: 12.5, color: COLORS.inkDim, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {preview}
        </p>
      )}
    </div>
  );
}

function NoteForm({ draft, setDraft, onSave, onCancel, onRemove, saving }) {
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  return (
    <div style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.accent}`, borderRadius: 7, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 8 }}>
        <Field label="Title"><input className="cm-input" value={draft.title} onChange={set('title')} placeholder="What's this about?" autoFocus /></Field>
        <Field label="Date (optional)"><input className="cm-input" type="date" value={draft.entry_date} onChange={set('entry_date')} /></Field>
      </div>
      <Field label="Notes">
        <textarea className="cm-input" rows={8} value={draft.body} onChange={set('body')} placeholder="Write freely…" style={{ resize: 'vertical' }} />
      </Field>

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
