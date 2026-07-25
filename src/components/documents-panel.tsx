import DangerAction from "@/components/danger-action";
import DocumentLink from "@/components/document-link";
import InlineForm from "@/components/inline-form";
import { Card, CardHeader, Field, Input } from "@/components/ui";
import { deleteDocument, uploadDocument } from "@/lib/actions/properties";
import type { Formatters } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { PropertyDocument } from "@/lib/types";
import { fill } from "@/lib/i18n/dictionaries";

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function DocumentsPanel({
  t,
  f,
  propertyId,
  documents,
  canEdit,
}: {
  t: Dict;
  f: Formatters;
  propertyId: string;
  documents: PropertyDocument[];
  canEdit: boolean;
}) {
  return (
    <Card>
      <CardHeader
        title={t.property.documentsTitle}
        description={t.property.documentsHint}
      />

      {documents.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{t.property.noDocuments}</p>
      ) : (
        <ul className="divide-y divide-border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="min-w-0 text-sm">
                <DocumentLink path={doc.storage_path} name={doc.file_name} />
                {doc.note && <p className="truncate">{doc.note}</p>}
                <p className="text-muted">
                  {f.date(new Date(doc.uploaded_at))}
                  {doc.size_bytes ? ` · ${formatSize(doc.size_bytes)}` : ""}
                </p>
              </div>
              {canEdit && (
                <DangerAction
                  action={deleteDocument}
                  fields={{
                    id: doc.id,
                    property_id: propertyId,
                    storage_path: doc.storage_path,
                  }}
                  trigger={t.common.delete}
                  title={t.documents.deleteTitle}
                  description={fill(t.documents.deleteDetail, { name: doc.file_name })}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="border-t border-border bg-surface-muted/40 p-5">
          <InlineForm action={uploadDocument} submitLabel={t.property.upload}>
            <input type="hidden" name="property_id" value={propertyId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.property.chooseFile} hint={t.property.fileHint}>
                <Input
                  name="file"
                  type="file"
                  accept=".pdf,image/*"
                  required
                  className="file:mr-3 file:rounded file:border-0 file:bg-surface-muted file:px-3 file:py-1 file:text-sm"
                />
              </Field>
              <Field
                label={t.property.documentNote}
                hint={t.property.documentNoteHint}
              >
                <Input name="note" placeholder={t.property.documentNotePlaceholder} />
              </Field>
            </div>
          </InlineForm>
        </div>
      )}
    </Card>
  );
}
