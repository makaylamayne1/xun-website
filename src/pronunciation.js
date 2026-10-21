import React, { useEffect, useId, useRef, useState } from "react";

export default function NamePronunciation() {
  const [isOpen, setIsOpen] = useState(false);
  const pronunciationRef = useRef(null);
  const triggerRef = useRef(null);
  const guideId = useId();

  function closeGuide() {
    setIsOpen(false);
    triggerRef.current.focus();
  }

  useEffect(() => {
    if (!isOpen) return;

    function closeOutside(event) {
      if (!pronunciationRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current.focus();
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <span className="name-pronunciation" ref={pronunciationRef}>
      <button type="button" className="pronunciation-trigger" ref={triggerRef} aria-label="Pronunciation of Xun" title="Pronunciation of Xun" aria-expanded={isOpen} aria-controls={isOpen ? guideId : undefined} onClick={() => setIsOpen((open) => !open)}>
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
          <circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 5.4v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="10" cy="14.2" r=".9" fill="currentColor" />
        </svg>
      </button>
      {isOpen && (
        <span className="pronunciation-guide" id={guideId} role="region" aria-label="Pronunciation of Xun">
          <button type="button" className="pronunciation-close" aria-label="Close pronunciation guide" onClick={closeGuide}>×</button>
          <span className="pronunciation-description">Xun is pronounced roughly “shün” in one syllable, with “ü” as in German “ü” or French “u.”</span>
          <span className="pronunciation-instructions">Start with “sh”; say “ee”; round your lips.</span>
          <span className="pronunciation-alternative">Alternatively, “sheen” works.</span>
        </span>
      )}
    </span>
  );
}
