import Link from "next/link";
import MarkNotesRead from "@/components/mark-notes-read";
import { Badge, Card } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { formatters } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import { fill, type Dict } from "@/lib/i18n/dictionaries";
import { getInbox, type InboxNote } from "@/lib/queries";
import type { Formatters } from "@/lib/format";

export default async function NotesPage() {
  await requireProfile();
  const [{ unread, recent }, { t, locale }] = await Promise.all([getInbox(), getDict()]);
  const f = formatters(locale);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.notes.inboxTitle}</h1>
        <p className="mt-1 text-sm text-muted">{t.notes.inboxHint}</p>
      </div>

      {/* Erst nach dem Anzeigen als gelesen melden, damit die Liste oben
          noch vollständig erscheint. */}
      <MarkNotesRead ids={unread.map((n) => n.id)} />

      <Card>
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">{t.notes.inboxUnread}</h2>
        </div>
        {unread.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">{t.notes.inboxNoUnread}</p>
        ) : (
          <NoteList t={t} f={f} notes={unread} highlight />
        )}
      </Card>

      <Card>
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">{t.notes.inboxRecent}</h2>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">{t.notes.inboxEmpty}</p>
        ) : (
          <NoteList t={t} f={f} notes={recent} />
        )}
      </Card>
    </div>
  );
}

function NoteList({
  t,
  f,
  notes,
  highlight = false,
}: {
  t: Dict;
  f: Formatters;
  notes: InboxNote[];
  highlight?: boolean;
}) {
  return (
    <ul className="divide-y divide-border">
      {notes.map((note) => (
        <li key={note.id} className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Link
              href={`/objekte/${note.property_id}?tab=notizen`}
              className="font-medium hover:underline"
            >
              {note.propertyName}
            </Link>
            <span className="text-muted">
              {note.authorName}{" "}
              {note.recipientName
                ? fill(t.notes.to, { name: note.recipientName })
                : t.notes.forEveryone}
            </span>
            <span className="text-xs text-muted">· {f.dateTime(note.created_at)}</span>
            {highlight && <Badge tone="accent">{t.notes.unread}</Badge>}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{note.body}</p>
        </li>
      ))}
    </ul>
  );
}
