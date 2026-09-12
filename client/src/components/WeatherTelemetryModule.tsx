import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlertTriangle, CloudRain, RefreshCw, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { trpc } from "@/lib/trpc";

const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&hourly=precipitation&forecast_days=1";
const STATION = { zoneId: "WEATHER-FALLBACK-CHENNAI", lat: 13.0827, lng: 80.2707 };
const WEATHER_CACHE_KEY = "landsora-open-meteo-weather-cache";

type OpenMeteoResponse = {
  hourly?: {
    time?: string[];
    precipitation?: number[];
  };
};

type CachedWeather = {
  payload: OpenMeteoResponse;
  cachedAt: string;
};

type Risk = {
  label: "LOW RISK" | "MODERATE RISK" | "HIGH RISK";
  color: string;
  background: string;
};

const getRisk = (rainfallMm: number): Risk => {
  if (rainfallMm < 30) {
    return { label: "LOW RISK", color: "#62d59a", background: "rgba(16,185,129,.12)" };
  }
  if (rainfallMm <= 70) {
    return { label: "MODERATE RISK", color: "#f2b84b", background: "rgba(245,158,11,.14)" };
  }
  return { label: "HIGH RISK", color: "#f1786c", background: "rgba(239,68,68,.14)" };
};

const sumPrecipitation = (values: number[]) =>
  values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);

export default function WeatherTelemetryModule({ embedded = false }: { embedded?: boolean }) {
  const [sensorOnline, setSensorOnline] = useState(true);
  const [weather, setWeather] = useState<OpenMeteoResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [lastWeatherUpdate, setLastWeatherUpdate] = useState<string | null>(null);
  const [isUsingCachedWeather, setIsUsingCachedWeather] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);

  const telemetryQuery = trpc.telemetry.liveStation.useQuery(STATION, {
    refetchInterval: 60_000,
    retry: 1,
  });

  const loadWeather = async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const response = await fetch(OPEN_METEO_URL);
      if (!response.ok) {
        throw new Error(`Open-Meteo request failed with HTTP ${response.status}`);
      }
      const payload = (await response.json()) as OpenMeteoResponse;
      setWeather(payload);
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ payload, cachedAt: new Date().toISOString() } satisfies CachedWeather));
      setIsUsingCachedWeather(false);
      setLastWeatherUpdate(new Date().toLocaleString());
    } catch (error) {
      const liveError = error instanceof Error ? error.message : "Unable to load Open-Meteo precipitation.";
      try {
        const cached = localStorage.getItem(WEATHER_CACHE_KEY);
        if (cached) {
          const { payload, cachedAt } = JSON.parse(cached) as CachedWeather;
          setWeather(payload);
          setLastWeatherUpdate(new Date(cachedAt).toLocaleString());
          setIsUsingCachedWeather(true);
          setWeatherError(null);
          return;
        }
      } catch {
        // Keep the live request error visible when the cache is unavailable or invalid.
      }
      setIsUsingCachedWeather(false);
      setWeatherError(liveError);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    void loadWeather();
    const interval = window.setInterval(() => void loadWeather(), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const rainfallMm = useMemo(
    () => sumPrecipitation(weather?.hourly?.precipitation ?? []),
    [weather],
  );
  const risk = getRisk(rainfallMm);
  const telemetry = telemetryQuery.data;
  const soilMoisture = telemetry?.soilMoisturePct;
  const factorOfSafety = telemetry?.geotechnicalAnalysis?.factorOfSafety;
  const combinedScore = useMemo(() => {
    const rainfallScore = Math.min(100, (rainfallMm / 70) * 100);
    const soilScore = typeof soilMoisture === "number" ? Math.min(100, soilMoisture) : 0;
    const stabilityScore =
      typeof factorOfSafety === "number" ? Math.max(0, Math.min(100, (2 - factorOfSafety) * 100)) : 0;
    return Math.round(rainfallScore * 0.6 + soilScore * 0.25 + stabilityScore * 0.15);
  }, [factorOfSafety, rainfallMm, soilMoisture]);

  return (
    <main style={{ ...styles.page, ...(embedded ? styles.embeddedPage : {}) }}>
      <section style={styles.container}>
        <div style={{ ...styles.header, ...(embedded ? styles.embeddedHeader : {}) }}>
          <div>
            <div style={styles.eyebrow}>LANDSORA / DUAL-SOURCE MONITORING</div>
            <h1 style={styles.title}>Weather &amp; Sensor Monitoring</h1>
            <p style={styles.subtitle}>
              Live Open-Meteo precipitation remains available when physical ground telemetry is interrupted.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSensorOnline(current => !current)}
            style={{ ...styles.toggle, borderColor: sensorOnline ? "#e09f3e" : "#62d59a" }}
          >
            {sensorOnline ? <WifiOff size={16} /> : <Wifi size={16} />}
            {sensorOnline ? "Simulate Physical Sensor Failure" : "Restore Physical Sensors"}
          </button>
        </div>

        <div
          role="status"
          style={{
            ...styles.banner,
            color: sensorOnline ? "#62d59a" : "#f2b84b",
            background: sensorOnline ? "rgba(16,185,129,.12)" : "rgba(245,158,11,.14)",
            borderColor: sensorOnline ? "rgba(16,185,129,.35)" : "rgba(245,158,11,.35)",
          }}
        >
          {sensorOnline ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
          {sensorOnline
            ? "Dual Telemetry Active"
            : "Physical Sensors Offline — Operating on Open-Meteo Weather API Fallback"}
        </div>
        {(isUsingCachedWeather || (!isOnline && weather !== null)) && (
          <div style={styles.cacheBanner} role="status" aria-live="polite">
            <WifiOff size={16} />
            <span>
              <strong>{!isOnline ? "Offline mode" : "Live weather unavailable"}</strong>
              {" — Showing precipitation from local cache."}
              {lastWeatherUpdate && <small> Cached at {lastWeatherUpdate}.</small>}
            </span>
          </div>
        )}

        <section style={{ ...styles.riskCard, ...(embedded ? styles.embeddedRiskCard : {}) }}>
          <div>
            <div style={styles.eyebrow}>PRIMARY LANDSLIDE RISK LEVEL</div>
            <div style={{ ...styles.riskLabel, color: risk.color }}>{risk.label}</div>
            <p style={styles.muted}>
              {sensorOnline
                ? "Calculated from Open-Meteo precipitation plus existing Landsora ground telemetry."
                : "Calculated from Open-Meteo precipitation accumulation only."}
            </p>
          </div>
          <div style={{ ...styles.score, color: risk.color }}>
            {combinedScore}
            <small>/100 combined index</small>
          </div>
        </section>

        <div style={styles.grid}>
          <section style={styles.card}>
            <div style={styles.cardHeading}>
              <CloudRain size={18} color="#38bdf8" />
              <div>
                <h2 style={styles.cardTitle}>Open-Meteo Rainfall</h2>
                <span style={styles.source}>LIVE · NO API KEY REQUIRED</span>
              </div>
            </div>
            <div style={styles.metric}>{weatherLoading ? "…" : rainfallMm.toFixed(1)} <small>mm / 24h</small></div>
            <p style={styles.muted}>
              {weatherError ?? `Accumulated from ${weather?.hourly?.precipitation?.length ?? 0} hourly readings.`}
            </p>
            <div style={styles.meta}>Source: api.open-meteo.com · Updated: {lastWeatherUpdate ?? "Loading"}</div>
            <button type="button" onClick={() => void loadWeather()} style={styles.refresh}>
              <RefreshCw size={14} /> Refresh weather
            </button>
          </section>

          <section style={{ ...styles.card, opacity: sensorOnline ? 1 : 0.62 }}>
            <div style={styles.cardHeading}>
              <ShieldCheck size={18} color="#e09f3e" />
              <div>
                <h2 style={styles.cardTitle}>Physical Ground Sensors</h2>
                <span style={styles.source}>{sensorOnline ? "EXISTING LAND SORA TELEMETRY" : "SIMULATED FAILURE"}</span>
              </div>
            </div>
            <div style={styles.sensorGrid}>
              <div><span>Soil moisture</span><strong>{sensorOnline && soilMoisture !== undefined ? `${soilMoisture.toFixed(1)}%` : "Offline"}</strong></div>
              <div><span>Factor of safety</span><strong>{sensorOnline && factorOfSafety !== undefined ? factorOfSafety.toFixed(2) : "Offline"}</strong></div>
            </div>
            <p style={styles.muted}>
              {sensorOnline
                ? telemetryQuery.isLoading
                  ? "Waiting for the existing Landsora telemetry service."
                  : telemetryQuery.error
                    ? "Existing physical telemetry is unavailable."
                    : "Ground readings are combined with rainfall for the primary index."
                : "Ground readings are excluded from risk calculation until sensors are restored."}
            </p>
            <div style={styles.meta}>Station: {STATION.zoneId} · Location: {STATION.lat}, {STATION.lng}</div>
          </section>
        </div>

        <footer style={styles.footer}>
          <span>Risk thresholds: &lt;30 mm LOW · 30–70 mm MODERATE · &gt;70 mm HIGH</span>
          <span>Weather source: Open-Meteo · Ground source: existing Landsora telemetry</span>
        </footer>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", background: "#0b0f12", color: "#f3f6f8", padding: "clamp(18px, 4vw, 54px)", fontFamily: "Inter, system-ui, sans-serif" },
  embeddedPage: { minHeight: 0, padding: 0, background: "transparent" },
  container: { maxWidth: 1180, margin: "0 auto" },
  header: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 22, flexWrap: "wrap", marginBottom: 24 },
  embeddedHeader: { alignItems: "center", marginBottom: 14 },
  eyebrow: { color: "#94a6b2", font: "600 10px 'JetBrains Mono', monospace", letterSpacing: "0.12em" },
  title: { fontSize: "clamp(28px, 5vw, 46px)", lineHeight: 1.08, margin: "8px 0", letterSpacing: "-.04em" },
  subtitle: { color: "#94a6b2", maxWidth: 650, margin: 0, lineHeight: 1.6 },
  toggle: { display: "inline-flex", alignItems: "center", gap: 8, color: "#f3f6f8", background: "#11171c", border: "1px solid", padding: "11px 14px", cursor: "pointer", font: "600 11px 'JetBrains Mono', monospace" },
  banner: { display: "flex", alignItems: "center", gap: 9, border: "1px solid", padding: "13px 15px", font: "700 12px 'JetBrains Mono', monospace", marginBottom: 18 },
  cacheBanner: { display: "flex", alignItems: "flex-start", gap: 9, color: "#f2c674", background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.35)", padding: "11px 14px", marginBottom: 18, font: "500 11px 'JetBrains Mono', monospace", lineHeight: 1.5 },
  riskCard: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, background: "#11171c", border: "1px solid #2d3e4a", padding: "22px 24px", marginBottom: 18 },
  embeddedRiskCard: { padding: "14px 16px", marginBottom: 14 },
  riskLabel: { fontSize: 28, fontWeight: 800, marginTop: 7 },
  score: { fontSize: 42, fontWeight: 800, textAlign: "right" },
  scoreSmall: { display: "block" },
  muted: { color: "#94a6b2", fontSize: 12, lineHeight: 1.6 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 },
  card: { background: "#11171c", border: "1px solid #22303a", padding: 22, minHeight: 250 },
  cardHeading: { display: "flex", alignItems: "center", gap: 10 },
  cardTitle: { margin: 0, fontSize: 17 },
  source: { display: "block", color: "#627582", font: "600 9px 'JetBrains Mono', monospace", marginTop: 4, letterSpacing: ".08em" },
  metric: { color: "#38bdf8", fontSize: 40, fontWeight: 800, margin: "30px 0 4px" },
  metricSmall: { fontSize: 12, fontWeight: 500 },
  meta: { color: "#627582", font: "400 10px 'JetBrains Mono', monospace", lineHeight: 1.6, marginTop: 15 },
  refresh: { display: "inline-flex", alignItems: "center", gap: 7, marginTop: 16, padding: "8px 10px", color: "#d9e2e7", background: "#162026", border: "1px solid #2d3e4a", cursor: "pointer", fontSize: 11 },
  sensorGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 30 },
  sensorMetric: { background: "#162026", padding: 13 },
  sensorMetricSpan: { display: "block", color: "#94a6b2", fontSize: 11, marginBottom: 5 },
  sensorMetricStrong: { fontSize: 24, color: "#e09f3e" },
  footer: { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", color: "#627582", font: "400 10px 'JetBrains Mono', monospace", borderTop: "1px solid #22303a", marginTop: 20, paddingTop: 15 },
};
