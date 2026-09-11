import { useEffect, type CSSProperties } from "react";

export interface AdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  riskScore: number;
  location: string;
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  backgroundColor: "rgba(10, 12, 14, 0.86)",
  backdropFilter: "blur(4px)",
};

const fieldStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "1rem",
  padding: "0.9rem 0",
  borderBottom: "1px solid #353a3f",
};

export function AdvisoryModal({ isOpen, onClose, riskScore, location }: AdvisoryModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="advisory-modal-title"
      style={overlayStyle}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "32rem",
          maxHeight: "calc(100vh - 2rem)",
          overflowY: "auto",
          color: "#f5f5f4",
          backgroundColor: "#1c2024",
          border: "1px solid #713f12",
          borderTop: "4px solid #dc2626",
          borderRadius: "0.75rem",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.55)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            padding: "1.25rem 1.25rem 1rem",
            borderBottom: "1px solid #353a3f",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 0.35rem",
                color: "#f59e0b",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
              }}
            >
              OFFICER REVIEW REQUIRED
            </p>
            <h2 id="advisory-modal-title" style={{ margin: 0, fontSize: "1.25rem", lineHeight: 1.25 }}>
              CRITICAL LANDSLIDE ADVISORY
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close advisory modal"
            style={{
              border: 0,
              padding: "0.25rem 0.45rem",
              color: "#a8adb3",
              backgroundColor: "transparent",
              fontSize: "1.5rem",
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </header>

        <div style={{ padding: "0.5rem 1.25rem 1.25rem" }}>
          <div style={fieldStyle}>
            <span style={{ color: "#a8adb3", fontSize: "0.85rem" }}>Affected Location</span>
            <strong style={{ maxWidth: "60%", textAlign: "right", fontSize: "0.9rem" }}>{location}</strong>
          </div>
          <div style={fieldStyle}>
            <span style={{ color: "#a8adb3", fontSize: "0.85rem" }}>Risk Score</span>
            <strong style={{ color: "#f87171", fontSize: "0.9rem" }}>{riskScore}</strong>
          </div>
          <div style={fieldStyle}>
            <span style={{ color: "#a8adb3", fontSize: "0.85rem" }}>Trigger Thresholds</span>
            <strong style={{ color: "#fbbf24", fontSize: "0.9rem", textAlign: "right" }}>Saturation 88%</strong>
          </div>
          <div style={fieldStyle}>
            <span style={{ color: "#a8adb3", fontSize: "0.85rem" }}>Target Audience</span>
            <strong style={{ fontSize: "0.9rem" }}>Emergency Ops</strong>
          </div>
          <div style={{ ...fieldStyle, borderBottom: 0 }}>
            <span style={{ color: "#a8adb3", fontSize: "0.85rem" }}>Current Status</span>
            <strong style={{ color: "#fbbf24", fontSize: "0.9rem", textAlign: "right" }}>
              Pending Officer Approval
            </strong>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: "1 1 15rem",
                minHeight: "2.75rem",
                padding: "0.7rem 1rem",
                color: "#fff",
                backgroundColor: "#b91c1c",
                border: "1px solid #ef4444",
                borderRadius: "0.4rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Approve &amp; Dispatch Advisory
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: "1 1 15rem",
                minHeight: "2.75rem",
                padding: "0.7rem 1rem",
                color: "#f5f5f4",
                backgroundColor: "#292e33",
                border: "1px solid #737373",
                borderRadius: "0.4rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Dismiss / Request Verification
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdvisoryModal;
