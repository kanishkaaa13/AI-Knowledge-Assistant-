"use client";

import * as React from "react";
import { useNotes } from "@/hooks/use-notes";
import { NoteCard } from "./note-card";
import { NoteEditor } from "./note-editor";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, Pin, Loader2 } from "lucide-react";
import type { Note } from "@/types/api";

export function NotesShell() {
  const [search, setSearch] = React.useState("");
  const [activeNoteId, setActiveNoteId] = React.useState<string | null>(null);

  const { notes, isLoading, createNote, updateNote, deleteNote, togglePinNote } = useNotes(search);

  // Auto-select first note if none active
  React.useEffect(() => {
    if (notes.length > 0 && !activeNoteId) {
      setActiveNoteId(notes[0].id);
    }
  }, [notes, activeNoteId]);

  const activeNote = React.useMemo(() => {
    return notes.find((n) => n.id === activeNoteId) || null;
  }, [notes, activeNoteId]);

  const handleCreateNote = async () => {
    try {
      const newNote = await createNote({
        title: "Untitled Note",
        content: "",
        tags: ""
      });
      if (newNote?.id) {
        setActiveNoteId(newNote.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNote(id);
      if (activeNoteId === id) {
        setActiveNoteId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await togglePinNote(id);
    } catch (e) {
      console.error(e);
    }
  };

  const pinnedNotes = React.useMemo(() => notes.filter((n) => n.is_pinned), [notes]);
  const unpinnedNotes = React.useMemo(() => notes.filter((n) => !n.is_pinned), [notes]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar - Note List */}
      <aside className="w-[320px] shrink-0 border-r border-border/40 bg-[var(--bg-secondary)] flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border/40 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">My Study Notes</h2>
            <Button
              onClick={handleCreateNote}
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 hover:text-white border-0 text-white shadow-none"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative flex items-center bg-[var(--border-color)] rounded-lg px-2.5 py-1.5 border border-transparent">
            <Search className="h-3.5 w-3.5 text-muted-foreground mr-2 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes or tags..."
              className="w-full bg-transparent text-xs text-white focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="text-xs">Loading notes...</span>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mb-2" />
              <p className="text-xs font-medium text-white/95">No Notes Found</p>
              <Button size="sm" onClick={handleCreateNote} className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-xs">
                Create a Note
              </Button>
            </div>
          ) : (
            <>
              {/* Pinned section */}
              {pinnedNotes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                    <Pin className="h-3 w-3 fill-current" /> Pinned
                  </div>
                  <div className="space-y-2">
                    {pinnedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isActive={activeNoteId === note.id}
                        onSelect={() => setActiveNoteId(note.id)}
                        onDelete={(e) => void handleDeleteNote(note.id, e)}
                        onTogglePin={(e) => void handleTogglePin(note.id, e)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Unpinned section */}
              <div className="space-y-2">
                {pinnedNotes.length > 0 && unpinnedNotes.length > 0 && (
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground pl-0.5">
                    Notes
                  </div>
                )}
                <div className="space-y-2">
                  {unpinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isActive={activeNoteId === note.id}
                      onSelect={() => setActiveNoteId(note.id)}
                      onDelete={(e) => void handleDeleteNote(note.id, e)}
                      onTogglePin={(e) => void handleTogglePin(note.id, e)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Editor Content Area */}
      <main className="flex-1 p-6 h-full flex flex-col min-w-0 bg-[var(--bg-chat)]">
        {activeNote ? (
          <NoteEditor
            key={activeNote.id}
            note={activeNote}
            onSave={(payload) => updateNote(activeNote.id, payload)}
            onTogglePin={() => togglePinNote(activeNote.id)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground bg-[var(--bg-primary)] border border-border/40 rounded-2xl">
            <FileText className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="text-sm font-semibold text-white">No Note Selected</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
              Select a note from the sidebar or create a new one to get started.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
