import { useCallback, useEffect, useState, type CSSProperties } from "react";

type RainfallData = {
  millimeters: number;
  observedAt: Date;
};

type UseRainfallResult = {
  rainfall: RainfallData;
  isLoading: boolean;
  isDegraded: boolean;
  error: Error | null;
  forceApiFailure: boolean;
  setForceApiFailure: (enabled: boolean) => void;
  refresh: () => void;
};

const STALE_AFTER_MS = 5 * 60 * 1000;

function createCachedRainfall(): RainfallData {
  const observedAt = new Date();
  observedAt.setHours(10, 38, 0, 0);
  return { millimeters: 86.4, observedAt };
}

function simulateRainfallApi(forceFailure: boolean): Promise<RainfallData> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (forceFailure) {
        reject(new Error("Rainfall API unavailable"));
        return;
      }

      resolve({
        millimeters: Number((70 + Math.random() * 30).toFixed(1)),
        observedAt: new Date(),
      });
    }, 450);
  });
}

export function useRainfallData(): UseRainfallResult {
  const [cachedRainfall] = useState<RainfallData>(createCachedRainfall);
  const [rainfall, setRainfall] = useState<RainfallData>(cachedRainfall);
  const [forceApiFailure, setForceApiFailure] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(() => {
    setIsLoading(true);
    simulateRainfallApi(forceApiFailure)
      .then((nextRainfall) => {
        setRainfall(nextRainfall);
        setError(null);
      })
      .catch((nextError: unknown) => {
        setRainfall(cachedRainfall);
        setError(nextError instanceof Error ? nextError : new Error("Rainfall API unavailable"));
      })
      .finally(() => setIsLoading(false));
  }, [cachedRainfall, forceApiFailure]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const isStale = now - rainfall.observedAt.getTime() > STALE_AFTER_MS;

  return {
    rainfall,
    isLoading,
    isDegraded: Boolean(error) || isStale,
    error,
    forceApiFailure,
    setForceApiFailure,
    refresh,
  };
}

const styles: Record<string, CSSProperties> = {
  section: {
    width: "100%",
    maxWidth: "48rem",
    margin: "0 auto",
    padding: "1.25rem",
    color: "#e5e7eb",
    backgroundColor: "#12141a",
    border: "1px solid #2f3541",
    borderRadius: "0.75rem",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    boxSizing: "border-box",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap",
    marginBottom: "1rem",
  },
  title: { margin: 0, color: "#f8fafc", fontSize: "1rem", fontWeight: 750 },
  toggleLabel: { display: "flex", alignItems: "center", gap: "0.6rem", color: "#cbd5e1", fontSize: "0.82rem" },
  toggle: { width: "1rem", height: "1rem", accentColor: "#f59e0b", cursor: "pointer" },
  banner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    marginBottom: "1rem",
    padding: "0.9rem 1rem",
    color: "#fde68a",
    backgroundColor: "#35230c",
    border: "1px solid #b7791f",
    borderRadius: "0.5rem",
    fontSize: "0.84rem",
    lineHeight: 1.45,
  },
  icon: { color: "#f59e0b", fontSize: "1.1rem", lineHeight: 1 },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.3rem 0.6rem",
    color: "#fed7aa",
    backgroundColor: "#7c2d12",
    border: "1px solid #f97316",
    borderRadius: "999px",
    fontSize: "0.7rem",
    fontWeight: 800,
    letterSpacing: "0.06em",
  },
  reading: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "1rem",
    paddingTop: "0.25rem",
  },
  value: { color: "#f8fafc", fontSize: "2rem", fontWeight: 750 },
  metadata: { color: "#94a3b8", fontSize: "0.78rem" },
};

export function DegradedRainfallDashboard() {
  const {
    rainfall,
    isLoading,
    isDegraded,
    forceApiFailure,
    setForceApiFailure,
    refresh,
  } = useRainfallData();

  return (
    <section style={styles.section} aria-labelledby="rainfall-dashboard-title">
      <div style={styles.toolbar}>
        <h2 id="rainfall-dashboard-title" style={styles.title}>
          Rainfall Monitor
        </h2>
        <label style={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={forceApiFailure}
            onChange={(event) => setForceApiFailure(event.target.checked)}
            style={styles.toggle}
          />
          Force API Failure
        </label>
      </div>

      {isDegraded && (
        <div role="alert" style={styles.banner}>
          <span aria-hidden="true" style={styles.icon}>
            !
          </span>
          <span>
            Weather API Unavailable · Using cached data from 10:38 AM · Risk engine operating in degraded mode.
          </span>
        </div>
      )}

      <div style={styles.reading}>
        <div>
          <div style={styles.metadata}>24-hour accumulated rainfall</div>
          <strong style={styles.value}>{rainfall.millimeters} mm</strong>
        </div>
        <span style={isDegraded ? styles.badge : { ...styles.badge, color: "#bbf7d0", backgroundColor: "#14532d", borderColor: "#22c55e" }}>
          {isDegraded ? "SIGNAL QUALITY: DEGRADED" : "SIGNAL QUALITY: GOOD"}
        </span>
      </div>

      <button
        type="button"
        onClick={refresh}
        disabled={isLoading}
        style={{
          marginTop: "1rem",
          padding: "0.55rem 0.8rem",
          color: "#cbd5e1",
          backgroundColor: "#20242d",
          border: "1px solid #3a4250",
          borderRadius: "0.4rem",
          cursor: isLoading ? "wait" : "pointer",
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? "Refreshing..." : "Refresh rainfall data"}
      </button>
    </section>
  );
}

export default DegradedRainfallDashboard;
