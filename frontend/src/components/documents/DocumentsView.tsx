import { useEffect, useState } from "react";
import type { DocumentRecord } from "@/types";
import { fetchDocuments, uploadDocument } from "@/lib/api";
import UploadDropzone from "./UploadDropzone";
import DocumentRow from "./DocumentRow";
import { Loader2 } from "lucide-react";

export default function DocumentsView() {
  const [docs, setDocs] = useState<DocumentRecord[] | null>(null);

  useEffect(() => {
    fetchDocuments().then(setDocs);
  }, []);

  async function handleFiles(files: File[]) {
    for (const file of files) {
      const record = await uploadDocument(file);
      setDocs((prev) => [record, ...(prev ?? [])]);
      simulateIngestion(record.id, setDocs);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto px-6 py-8">
      <div>
        <div className="text-[15px] font-semibold text-ink tracking-tight">Documents</div>
        <div className="mt-1 text-[12px] text-faint">
          Uploaded files are parsed, entities extracted, and linked into the knowledge graph.
        </div>
      </div>

      <UploadDropzone onFiles={handleFiles} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-caption text-faint">INGESTED ({docs?.length ?? 0})</span>
        </div>
        {docs === null ? (
          <div className="flex items-center gap-2 py-8 text-faint">
            <Loader2 size={13} className="animate-spin" strokeWidth={2} />
            <span className="text-[12px]">Loading documents…</span>
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface flex flex-col items-center justify-center py-12 text-faint">
            <div className="text-[13px] font-medium text-ink/60">No documents uploaded</div>
            <div className="mt-1 text-[11px]">Upload a document to begin processing</div>
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-surface overflow-hidden">
            {docs.map((d) => (
              <DocumentRow key={d.id} doc={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function simulateIngestion(id: string, setDocs: React.Dispatch<React.SetStateAction<DocumentRecord[] | null>>) {
  const update = (patch: Partial<DocumentRecord>) =>
    setDocs((prev) => (prev ? prev.map((d) => (d.id === id ? { ...d, ...patch } : d)) : prev));

  setTimeout(() => update({ status: "extracting" }), 700);
  setTimeout(() => update({ status: "linked", linkedEntities: 2 + Math.floor(Math.random() * 4) }), 2400);
}
