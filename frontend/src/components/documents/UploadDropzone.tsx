import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

export default function UploadDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files));
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition-colors duration-150 ${
        dragOver ? "border-lineH bg-surface2" : "border-line bg-surface hover:border-lineH hover:bg-surface2/50"
      }`}
    >
      <UploadCloud size={18} className="text-faint" strokeWidth={1.8} />
      <div>
        <div className="text-[12.5px] font-medium text-ink/80">Drop files or click to browse</div>
        <div className="mt-1 text-[11px] text-faint">PDFs, scans, spreadsheets, P&amp;ID drawings</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}
