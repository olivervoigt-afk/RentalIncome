import DangerAction from "@/components/danger-action";
import InlineForm from "@/components/inline-form";
import MarkNotesRead from "@/components/mark-notes-read";
import { Badge, Card, CardHeader, Field, Select, Textarea } from "@/components/ui";
import { addNote, deleteNote } from "@/lib/actions/notes";
import type { Formatters } from "@/lib/format";
import { fill, type Dict } from "@/lib/i18n/dictionaries";
import type { NoteWithNames } from "@/lib/queries";
import type { Profile } from "@/lib/types";

export default function NotesTab({
  t,
  f,
  propertyId,
  notes,
  people,
  viewerId,
}: {
  t: Dict;
  f: Formatters;
  propertyId: string;
  notes: NoteWithNames[];
  people: Profile[];
  viewerId: string;
}) {
  const roots = notes.filter((n) => !n.parent_id);
  const repliesOf = new Map<string, NoteWithNames[]>();
  for (const note of notes) {
    if (!note.parent_id) continue;
    repliesOf.set(note.parent_id, [...(repliesOf.get(note.parent_id) ?? []), note]);
  }

  const unread = (note: NoteWithNames) =>
    note.recipient_id === viewerId && note.read_at === null;

  return (
    <div className="space-y-6">
      <MarkNotesRead ids={notes.filter(unread).map((n) => n.id)} />

      <Card>
        <CardHeader title={t.notes.compose} description={t.notes.hint} />
        <div className="p-5">
          <NoteForm
            t={t}
            propertyId={propertyId}
            people={people}
            viewerId={viewerId}
          />
        </div>
      </Card>

      <Card>
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">{t.notes.title}</h2>
        </div>

        {roots.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">{t.notes.none}</p>
        ) : (
          <ul className="divide-y divide-border">
            {roots.map((note) => (
              <li key={note.id} className="px-5 py-4">
                <NoteBody t={t} f={f} note={note} unread={unread(note)} viewerId={viewerId} propertyId={propertyId} />

                {(repliesOf.get(note.id) ?? []).length > 0 && (
                  <ul className="mt-3 space-y-3 border-l-2 border-border pl-4">
                    {(repliesOf.get(note.id) ?? []).map((reply) => (
                      <li key={reply.id}>
                        <NoteBody
                          t={t}
                          f={f}
                          note={reply}
                          unread={unread(reply)}
                          viewerId={viewerId}
                          propertyId={propertyId}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-muted hover:text-foreground">
                    {fill(t.notes.replyTo, { name: note.authorName })}
                  </summary>
                  <div className="mt-3 max-w-2xl">
                    <NoteForm
                      t={t}
                      propertyId={propertyId}
                      people={people}
                      viewerId={viewerId}
                      parentId={note.id}
                      /* Eine Antwort geht an den Verfasser, nicht zurück an einen selbst. */
                      fixedRecipient={note.author_id === viewerId ? null : note.author_id}
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function NoteBody({
  t,
  f,
  note,
  unread,
  viewerId,
  propertyId,
}: {
  t: Dict;
  f: Formatters;
  note: NoteWithNames;
  unread: boolean;
  viewerId: string;
  propertyId: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-medium">{note.authorName}</span>
        <span className="text-muted">
          {note.recipientName
            ? fill(t.notes.to, { name: note.recipientName })
            : t.notes.forEveryone}
        </span>
        <span className="text-xs text-muted">· {f.dateTime(note.created_at)}</span>
        {unread && <Badge tone="accent">{t.notes.unread}</Badge>}

        {note.author_id === viewerId && (
          <span className="ml-auto">
            <DangerAction
              action={deleteNote}
              fields={{ id: note.id, property_id: propertyId }}
              trigger={t.common.delete}
              title={t.notes.deleteTitle}
              description={t.notes.deleteDetail}
            />
          </span>
        )}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm">{note.body}</p>
    </div>
  );
}

function NoteForm({
  t,
  propertyId,
  people,
  viewerId,
  parentId,
  fixedRecipient,
}: {
  t: Dict;
  propertyId: string;
  people: Profile[];
  viewerId: string;
  parentId?: string;
  fixedRecipient?: string | null;
}) {
  const others = people.filter((p) => p.id !== viewerId);

  return (
    <InlineForm action={addNote} submitLabel={t.notes.send}>
      <input type="hidden" name="property_id" value={propertyId} />
      {parentId && <input type="hidden" name="parent_id" value={parentId} />}

      <Field label={t.notes.body}>
        <Textarea name="body" rows={3} required placeholder={t.notes.bodyPlaceholder} />
      </Field>

      {fixedRecipient !== undefined ? (
        <input type="hidden" name="recipient_id" value={fixedRecipient ?? ""} />
      ) : (
        <Field label={t.notes.recipient} hint={t.notes.everyoneHint}>
          <Select name="recipient_id" defaultValue="">
            <option value="">{t.notes.everyone}</option>
            {others.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name || person.email}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </InlineForm>
  );
}
