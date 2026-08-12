import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { api } from '../services/api';
import { FileText, Search, Plus, Trash2, Edit2, Save, X, Calendar } from 'lucide-react';

export const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    api.getNotes().then(setNotes).catch(console.error);
  }, []);

  const handleStartEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const updated = await api.updateNote(id, editContent);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setEditingNoteId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    try {
      await api.deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotes = notes.filter((n) =>
    n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.videoTitle && n.videoTitle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-pink-600" />
            <span>Study Notes</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">All saved notes across your YouTube study plans</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-pink-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
          />
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="p-12 text-center bg-white/90 border border-pink-200 rounded-3xl space-y-2 shadow-2xs">
          <FileText className="w-8 h-8 text-pink-300 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">No notes found. Write notes inside the study video player to save them here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <div key={note.id} className="p-5 rounded-2xl bg-white/95 border border-pink-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-pink-100 pb-2">
                <div>
                  <h3 className="text-xs font-black text-slate-900">{note.videoTitle || `Day ${note.dayNumber}`}</h3>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                    <Calendar className="w-3 h-3 text-pink-500" />
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {editingNoteId === note.id ? (
                    <button
                      onClick={() => handleSaveEdit(note.id)}
                      className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartEdit(note)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-pink-50"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {editingNoteId === note.id ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={5}
                  className="w-full p-3 bg-pink-50/40 border border-pink-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-pink-500"
                ></textarea>
              ) : (
                <div className="p-3 rounded-xl bg-pink-50/40 border border-pink-100 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {note.content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
