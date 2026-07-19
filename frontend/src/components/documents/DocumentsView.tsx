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
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto px-4 py-8">
      <div>
        <div className="font-display text-[20px] font-medium text-ink">Documents</div>
        <div className="mt-0.5 text-[13px] text-soft">
          Everything uploaded here gets parsed, has its entities extracted, and is linked into the knowledge graph automatically.
        </div>
      </div>

      <UploadDropzone onFiles={handleFiles} />

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[12px] font-medium text-soft">Ingested ({docs?.length ?? 0})</span>
        </div>
        {docs === null ? (
          <div className="flex items-center gap-2 py-8 text-soft">
            <Loader2 size={15} className="animate-spin" />
            <span className="text-[13px]">Loading documents…</span>
          </div>
        ) : docs.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-12 text-soft">
            <span className="font-display text-[15px] text-ink">No documents uploaded</span>
            <span className="mt-1 text-[13px]">Upload a document to begin processing</span>
          </div>
        ) : (
          <div className="card px-3">
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
