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
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
        dragOver ? "border-amber bg-amber/[0.05]" : "border-line hover:border-faint"
      }`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface2">
        <UploadCloud size={18} className="text-soft" />
      </span>
      <div className="text-[13.5px] font-medium text-ink">Drag files here, or click to browse</div>
      <div className="text-[12px] text-faint">PDFs, scans, spreadsheets, P&amp;ID drawings</div>
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
