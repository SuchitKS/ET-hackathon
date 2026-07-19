import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import "./ChatInput.css";

export default function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <div className="chat-input-wrapper">
      <div className="grid-bg" />
      <div id="poda">
        <div className="glow" />
        <div className="darkBorderBg" />
        <div className="darkBorderBg" />
        <div className="darkBorderBg" />

        <div className="white" />

        <div className="border" />

        <div id="main">
          <input
            ref={inputRef}
            placeholder="Search..."
            type="text"
            name="text"
            className="input"
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="off"
            spellCheck="false"
          />
          <div id="input-mask" />
          <div id="accent-mask" />
          
          <div id="search-icon">
            {disabled ? (
              <Loader2 size={18} className="animate-spin text-faint" strokeWidth={2} />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={24}
                viewBox="0 0 24 24"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                height={24}
                fill="none"
                className="feather feather-search"
              >
                <circle stroke="#c0b9c0" r={8} cy={11} cx={11} />
                <line stroke="#c0b9c0" y2="16.65" y1={22} x2="16.65" x1={22} />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
