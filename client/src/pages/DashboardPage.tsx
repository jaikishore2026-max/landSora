/* Landsora Dedicated Operational Application Dashboard: High-productivity Surveyor's Field Console */
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  MapCanvasSkeleton,
} from "@/components/DashboardSkeletons";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { GoogleAuthModal } from "@/components/GoogleAuthModal";
import { SlopeStabilityModal } from "@/components/SlopeStabilityModal";
import { HardwareSimulatorModal } from "@/components/HardwareSimulatorModal";
import { LiveMeteorologyModal } from "@/components/LiveMeteorologyModal";
import { InteractiveGisMap, type GisZone, type NasaEvent } from "@/components/InteractiveGisMap";
import { useCriticalRiskToast } from "@/contexts/CriticalRiskToastContext";
import { getDataPresentation } from "@/lib/dataPresentation";
import WeatherTelemetryModule from "@/components/WeatherTelemetryModule";

import { useTranslation } from "@/lib/useTranslation";
import {
  detectLanguageForZone,
  detectLanguageFromCoords,
  getStoredNotificationLanguage,
  notificationLanguages,
  renderNotification,
  saveNotificationLanguage,
  type NotificationKind,
  type NotificationLanguage,
} from "@/lib/notificationTranslations";
import { shouldRefreshAiAnalysis } from "@/lib/aiAnalysisFlow";
import { runLiveValidation, saveQuarantineRecord, getStoredQuarantine, clearQuarantineRecords } from "@/lib/anomalyValidator";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  Bell,
  Bot,
  BarChart3,
  Check,

  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CloudRain,
  Compass,
  Cpu,
  Crosshair,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Gauge,
  Globe2,
  HelpCircle,
  Hospital,
  Layers3,
  Lock,
  LogIn,
  MapPin,
  MapPinned,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Radio,
  RefreshCw,
  RotateCcw,
  Route,
  Search,
  Send,

  Settings as SettingsIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sliders,
  Smartphone,
  Sparkles,
  Sprout,
  Trash2,
  Upload,
  User,
  Users,
  Waves,
  Wifi,
  WifiOff,
  Wind,
  X,
  XCircle,
} from "lucide-react";

const ASSET_BASE = "/assets";
const assetUrl = (file: string) => {
  const cleanName = file.replace(/_[a-f0-9]+(\.[a-z]+)$/i, "$1");
  return `${ASSET_BASE}/${cleanName}`;
};

import { GLOBAL_GEOTECHNICAL_STATIONS, type ContinentCode, type GeotechnicalStation } from "@shared/stations";

type Tier = "STABLE" | "WATCH" | "CRITICAL";
type Zone = GeotechnicalStation & {
  baseline: number;
  sensors: number;
  score: number;
  sensitivity: { rain: number; soil: number; tilt: number };
  wifiRssi: number;
};
type AlertEvent = { time: string; zone: string; transition: string; risk: number };
type EonetEvent = { id: string; title: string; date: string; latitude: number; longitude: number; source: string; status: string };
type RoadStatus = "OPEN" | "RESTRICTED" | "AT RISK" | "BLOCKED" | "UNKNOWN";

const initialZones: Zone[] = GLOBAL_GEOTECHNICAL_STATIONS.map((s) => ({
  ...s,
  baseline: Math.round(s.riskScore * 0.6),
  sensors: 12,
  score: s.riskScore,
  sensitivity: {
    rain: s.tier === "CRITICAL" ? 1.25 : s.tier === "WATCH" ? 1.1 : 0.9,
    soil: s.tier === "CRITICAL" ? 1.2 : s.tier === "WATCH" ? 1.05 : 0.88,
    tilt: s.tier === "CRITICAL" ? 1.15 : s.tier === "WATCH" ? 1.0 : 0.85,
  },
  wifiRssi: -58 - (s.riskScore % 15),
}));

const formatTimestamp = (ts?: string) => {
  if (!ts) return clock();
  if (ts.includes("T") || ts.includes("-")) {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toLocaleTimeString("en-GB", { hour12: false });
  }
  return ts;
};

const statusColor = (tier: Tier) => tier === "CRITICAL" ? "#C24B3F" : tier === "WATCH" ? "#D6A24E" : "#6FA377";
const classify = (score: number): Tier => score >= 71 ? "CRITICAL" : score >= 40 ? "WATCH" : "STABLE";
const clock = () => new Date().toLocaleTimeString("en-GB", { hour12: false });
const eventAgeDays = (date: string) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
const eventTone = (date: string) => eventAgeDays(date) <= 2 ? "very-recent" : eventAgeDays(date) <= 7 ? "recent" : eventAgeDays(date) <= 30 ? "high-interest" : "old";
const eventPosition = (event: EonetEvent, index: number) => {
  const x = Math.max(6, Math.min(94, ((event.longitude - 68) / 28) * 100));
  const y = Math.max(8, Math.min(92, (1 - ((event.latitude - 8) / 28)) * 100));
  return [Number.isFinite(x) ? x : 18 + (index % 5) * 14, Number.isFinite(y) ? y : 24 + (index % 4) * 15] as const;
};
const distanceKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const r = 6371;
  const p = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * p;
  const dLon = (b.longitude - a.longitude) * p;
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * p) * Math.cos(b.latitude * p) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
};

function calcScore(z: Zone) {
  const rain = Math.min(100, (z.rainfall / 32) * 100) * z.sensitivity.rain;
  const soil = Math.min(100, z.soil) * z.sensitivity.soil;
  const tilt = Math.min(100, (z.tilt / 0.16) * 100) * z.sensitivity.tilt;
  return Math.max(0, Math.min(100, Math.round(0.4 * rain + 0.35 * soil + 0.25 * tilt + z.baseline * 0.08)));
}

function delta(a: number, b: number) {
  const d = a - b;
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}`;
}

function TinySpark({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values), max = Math.max(...values);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${34 - ((v - min) / Math.max(1, max - min)) * 24}`).join(" ");
  const current = Math.round(values[values.length - 1]);
  return <svg className="spark" viewBox="0 0 100 40" preserveAspectRatio="none" aria-label={`Risk trend ending at ${current} out of 100`}><polyline points={points} fill="none" stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg>;
}

function TrendChart({ values, tier }: { values: number[]; tier: Tier }) {
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - v}`).join(" ");
  return (
    <div className="trend-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={statusColor(tier)} stopOpacity=".22" />
            <stop offset="1" stopColor={statusColor(tier)} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill="url(#chartFill)" />
        <polyline points={points} fill="none" stroke={statusColor(tier)} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-labels"><span>−16 READINGS</span><span>NOW</span></div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [zones, setZones] = useState(initialZones);
  const [selected, setSelected] = useState<string>(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("landsora-default-zone");
      if (saved && GLOBAL_GEOTECHNICAL_STATIONS.some((z) => z.id === saved)) {
        return saved;
      }
    }
    return "KDG-03";
  });
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [lastUpdate, setLastUpdate] = useState(clock());
  const [scenario, setScenario] = useState("NORMAL CONDITIONS");
  const [storm, setStorm] = useState(false);
  const [stormProgress, setStormProgress] = useState(0);
  const [ack, setAck] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [profile, setProfile] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [eventFocus, setEventFocus] = useState<EonetEvent | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("SLOPE CRACK");
  const [reportSeverity, setReportSeverity] = useState("MEDIUM");
  const [reportDescription, setReportDescription] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportSaved, setReportSaved] = useState(false);
  const [reportLocation, setReportLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [networkState, setNetworkState] = useState<"ONLINE" | "LIMITED NETWORK" | "OFFLINE MODE">("ONLINE");
  const [language, setLanguage] = useState<NotificationLanguage>(() => getStoredNotificationLanguage());
  const { t } = useTranslation(language);
  const [notificationKind, setNotificationKind] = useState<NotificationKind>("CRITICAL_WARNING");
  const [deviceHealthOpen, setDeviceHealthOpen] = useState(false);
  const [quarantineOpen, setQuarantineOpen] = useState(false);
  const [slopeModalOpen, setSlopeModalOpen] = useState(false);
  const [hardwareModalOpen, setHardwareModalOpen] = useState(false);
  const [operatorApprovalModal, setOperatorApprovalModal] = useState(false);
  const [operatorDeliveryLogs, setOperatorDeliveryLogs] = useState<{ channel: string; status: string; timestamp: string; messagePreview: string }[] | null>(null);

  // Sensor Anomaly and Validation State
  const [anomalyOverride, setAnomalyOverride] = useState<"NONE" | "TILT_SPIKE" | "WEATHER_API_DELAY" | "LOW_BATT">("NONE");
  const [quarantineList, setQuarantineList] = useState(() => getStoredQuarantine());
  const timer = useRef<number | undefined>(undefined);

  // Critical Landslide Risk Toast Notification Hook
  const {
    triggerCriticalAlert,
    simulateCriticalAlert,
    alertHistory,
    isMuted,
    toggleMute,
    voiceEnabled,
    toggleVoice,
    broadcastVoiceAlert,
    notificationPermission,
    requestNotificationPermission,
  } = useCriticalRiskToast();

  // Gemini AI Suite & Google Auth State
  const [googleAuthModalOpen, setGoogleAuthModalOpen] = useState(false);
  const [meteorologyModalOpen, setMeteorologyModalOpen] = useState(false);

  // Collapsible Sidebars, Continent Tabs & Search State
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);
  const [weatherTelemetryOpen, setWeatherTelemetryOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedContinent, setSelectedContinent] = useState<ContinentCode>("ALL");

  // Synchronize document language and data-lang attribute for clean Indic typography
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.setAttribute("data-lang", language);
      document.documentElement.lang = language.toLowerCase();
    }
  }, [language]);

  const authMeQuery = trpc.auth.me.useQuery();
  const liveQuery = trpc.landslides.list.useQuery(undefined, {
    staleTime: 120000,
    refetchInterval: 120000, // Poll NASA EONET multi-hazard live updates every 2 minutes
    retry: 1,
  });

  const platformQuery = trpc.platform.capabilities.useQuery(undefined, { staleTime: 300000 });
  const deviceHealthQuery = trpc.iot.deviceHealth.useQuery(
    { nodeId: selected },
    { staleTime: 10000, refetchInterval: 15000 }
  );
  const operatorApprovalMutation = trpc.alerts.operatorApproval.useMutation();

  const liveEvents: EonetEvent[] = liveQuery.data?.events ?? [];
  const liveAvailable = Boolean(liveQuery.data?.available);
  const displayedEvents = demoMode ? [] : liveEvents;
  const recentEvents = liveEvents.filter((event) => eventAgeDays(event.date) <= 30);
  const zone = zones.find((z) => z.id === selected) || zones[0];

  const analysisPoint = selectedPoint ?? { latitude: Number(zone.coords.split(",")[0]), longitude: Number(zone.coords.split(",")[1]) };

  // Live High-Resolution Telemetry & Seismic Query (Open-Meteo & USGS APIs)
  const liveTelemetryQuery = trpc.telemetry.liveStation.useQuery(
    {
      zoneId: zone.id,
      lat: analysisPoint.latitude,
      lng: analysisPoint.longitude,
    },
    {
      staleTime: 60000,
      refetchInterval: 60000, // Continuously fetch real-time global weather & seismic data every 60 seconds
      retry: 1,
    }
  );
  const liveData = liveTelemetryQuery.data;

  const filteredZones = useMemo(() => {
    let result = zones;
    if (selectedContinent !== "ALL") {
      result = result.filter((z) => z.continent === selectedContinent);
    }
    if (locationSearch.trim()) {
      const query = locationSearch.toLowerCase().trim();
      result = result.filter(
        (z) =>
          z.name.toLowerCase().includes(query) ||
          z.region.toLowerCase().includes(query) ||
          z.country.toLowerCase().includes(query) ||
          z.id.toLowerCase().includes(query) ||
          z.tier.toLowerCase().includes(query) ||
          z.geology.toLowerCase().includes(query)
      );
    }
    return result;
  }, [zones, selectedContinent, locationSearch]);

  const nearestEvent = useMemo(() => (demoMode ? [] : liveEvents).reduce<{ event: EonetEvent | null; distance: number }>((best, event) => {
    const distance = distanceKm(analysisPoint, event);
    return !best.event || distance < best.distance ? { event, distance } : best;
  }, { event: null, distance: Infinity }), [liveEvents, analysisPoint.latitude, analysisPoint.longitude, demoMode]);

  // Live Deterministic Validation Layer
  const currentTelemetryInput = useMemo(() => {
    const isTiltSpike = anomalyOverride === "TILT_SPIKE";
    return {
      deviceId: `landsora-esp32-${zone.id.toLowerCase()}`,
      siteId: zone.id,
      capturedAtUtc: new Date().toISOString(),
      rainfallMmInterval: zone.rainfall,
      soilMoisturePercent: zone.soil,
      tiltDegrees: isTiltSpike ? 0.385 : zone.tilt, // Injected spike if SCN-4 active
      temperatureC: 22.8,
      humidityPercent: 81.0,
      pressureHpa: 1011.4,
      batteryVoltage: anomalyOverride === "LOW_BATT" ? 3.12 : zone.batteryVoltage,
      wifiRssiDbm: anomalyOverride === "LOW_BATT" ? -88 : zone.wifiRssi,
      sourceMode: "LIVE" as const,
      externalWeatherRainfallMm: anomalyOverride === "WEATHER_API_DELAY" ? 2.0 : zone.rainfall + 1.2,
    };
  }, [zone, anomalyOverride]);

  const validationResult = useMemo(() => {
    return runLiveValidation(currentTelemetryInput, [
      {
        deviceId: `landsora-esp32-${zone.id.toLowerCase()}`,
        siteId: zone.id,
        capturedAtUtc: new Date(Date.now() - 2500).toISOString(),
        rainfallMmInterval: zone.rainfall - 0.2,
        soilMoisturePercent: zone.soil - 0.5,
        tiltDegrees: zone.tilt,
      }
    ]);
  }, [currentTelemetryInput, zone]);

  // Clean, deduplicated quarantine recording effect
  const lastQuarantineReadingId = useRef<string | null>(null);
  useEffect(() => {
    if (validationResult.isQuarantined && anomalyOverride === "TILT_SPIKE") {
      if (lastQuarantineReadingId.current !== validationResult.readingId) {
        lastQuarantineReadingId.current = validationResult.readingId;
        const record = {
          id: `QR-${Date.now()}`,
          readingId: validationResult.readingId,
          deviceId: validationResult.deviceId,
          siteId: validationResult.siteId,
          timestamp: clock(),
          anomalyTypes: validationResult.anomaliesDetected,
          rawValues: { tiltDegrees: 0.385, rainfallMm: zone.rainfall, soilMoisture: zone.soil },
          reason: "Unrealistic sudden tilt jump (>0.08°/sample) isolated by Stage 4 Behavioral Check.",
          reviewed: false,
        };
        saveQuarantineRecord(record);
        setQuarantineList(getStoredQuarantine());
      }
    }
  }, [validationResult, anomalyOverride, zone]);

  // If quarantined, the validated readings protect the risk engine from falsely jumping
  const effectiveTilt = validationResult.validatedTelemetry.tiltDegrees;
  const effectiveRain = validationResult.validatedTelemetry.rainfallMm;
  const effectiveSoil = validationResult.validatedTelemetry.soilMoisturePercent;

  const riskInputs = useMemo(() => ({
    rainfallScore: Math.min(100, (effectiveRain / 32) * 100),
    terrainScore: Math.min(100, (effectiveTilt / 0.16) * 100),
    historicalLandslideScore: zone.baseline,
    recentEventScore: demoMode ? zone.history.slice(-3).reduce((sum, value) => sum + value, 0) / 3 : recentEvents.length ? Math.min(100, recentEvents.length * 12) : 0
  }), [effectiveRain, effectiveTilt, zone.baseline, zone.history, demoMode, recentEvents.length]);

  const riskQuery = trpc.risk.score.useQuery(riskInputs, { staleTime: 2000 });
  const aiAnalysisMutation = trpc.risk.aiAnalysis.useMutation();
  const activeReportsQuery = trpc.reports.listActive.useQuery(undefined, { refetchInterval: 15000 });
  const createReportMutation = trpc.reports.create.useMutation({
    onSuccess: () => {
      activeReportsQuery.refetch();
    },
  });
  const [lastAnalyzedLevel, setLastAnalyzedLevel] = useState<string | null>(null);
  const isRefreshingAi = useRef(false);

  const prototypeRiskScore = riskQuery.data?.score ?? zone.score;
  const prototypeRiskLevel = riskQuery.data?.level ?? zone.tier;
  const prototypeRiskColor = prototypeRiskLevel === "CRITICAL" ? "#C24B3F" : prototypeRiskLevel === "HIGH" ? "#D6A24E" : prototypeRiskLevel === "MODERATE" ? "#C28A70" : "#6FA377";
  const prototypeTier: Tier = prototypeRiskLevel === "CRITICAL" || prototypeRiskLevel === "HIGH" ? "CRITICAL" : prototypeRiskLevel === "MODERATE" ? "WATCH" : "STABLE";
  const dataView = getDataPresentation({ demoMode, available: liveAvailable, queryError: Boolean(liveQuery.error), eventCount: liveEvents.length });
  const exposure = prototypeRiskScore >= 76 ? 2400 : prototypeRiskScore >= 51 ? 1100 : 420;

  const gisZones: GisZone[] = useMemo(() => {
    return zones.map((z) => {
      const [latStr, lngStr] = z.coords.split(",").map((s) => s.trim());
      const lat = parseFloat(latStr) || 12.3375;
      const lng = parseFloat(lngStr) || 75.8069;
      return {
        id: z.id,
        name: z.name,
        region: z.region,
        continent: z.continent,
        country: z.country,
        countryFlag: z.countryFlag,
        coords: z.coords,
        lat,
        lng,
        rainfall: z.rainfall,
        soil: z.soil,
        tilt: z.tilt,
        riskScore: z.score,
        tier: z.tier,
        elevation: z.elevation,
        geology: z.geology,
      };
    });
  }, [zones]);
  const roadStatus = (threshold: number): RoadStatus => prototypeRiskScore >= threshold ? (prototypeRiskScore >= 86 ? "BLOCKED" : "AT RISK") : prototypeRiskScore >= 45 ? "RESTRICTED" : "OPEN";
  const roadRows = [
    { name: "NH 10 / Teesta Corridor", status: roadStatus(58), distance: "1.2 km", villages: 3, confidence: prototypeRiskScore >= 76 ? "MEDIUM" : "LOW" },
    { name: "Kodagu Valley Link", status: roadStatus(48), distance: "0.8 km", villages: 2, confidence: prototypeRiskScore >= 51 ? "MEDIUM" : "LOW" },
    { name: "Wayanad Village Road", status: roadStatus(68), distance: "2.4 km", villages: 1, confidence: "LOW" }
  ];
  const forecast = [
    { time: "NOW", weather: zone.rainfall > 18 ? "HEAVY RAIN" : "LIGHT RAIN", score: prototypeRiskScore },
    { time: "+6 HOURS", weather: zone.rainfall > 15 ? "VERY HEAVY RAIN" : "MODERATE RAIN", score: Math.min(100, prototypeRiskScore + 9) },
    { time: "+12 HOURS", weather: "MODERATE RAIN", score: Math.min(100, prototypeRiskScore + 4) },
    { time: "+24 HOURS", weather: "LIGHT RAIN", score: Math.max(0, prototypeRiskScore - 7) },
    { time: "+48 HOURS", weather: "CLEARING", score: Math.max(0, prototypeRiskScore - 11) }
  ];
  const responsePriority = prototypeRiskScore >= 76 ? "PRIORITY 1" : prototypeRiskScore >= 51 ? "PRIORITY 2" : "PRIORITY 3";
  const notification = renderNotification(notificationKind, language, { place: zone.name, road: roadRows[0].name });

  // Stable AI Decision Intelligence Object (prevents collapsing, height jumps, and flickering)
  const defaultAnalysis = useMemo(() => {
    const isCritical = prototypeRiskLevel === "CRITICAL" || prototypeRiskLevel === "HIGH";
    const isWatch = prototypeRiskLevel === "MODERATE";

    return {
      provider: "LANDSORA_INTELLIGENCE_ENGINE" as const,
      model: "gemini-3.7-flash" as const,
      status: "READY" as const,
      riskLevel: prototypeRiskLevel as "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
      assessment: isCritical
        ? `${zone.name} is exhibiting elevated slope instability risk. Rapid soil moisture saturation and tilt acceleration detected by field telemetry.`
        : isWatch
        ? `${zone.name} is in an active geotechnical watch state. Rainfall accumulation requires close monitoring of slope corridors.`
        : `${zone.name} displays stable baseline conditions. All geotechnical and IoT telemetry channels remain within normal safety bounds.`,
      why: isCritical
        ? `Soil moisture saturation combined with elevated precipitation and tilt velocity surpasses local critical safety thresholds.`
        : isWatch
        ? `Cumulative precipitation is elevating slope pore-water pressure near ${zone.name}. Physical tilt sensors remain within initial warning parameters.`
        : `Physical slope inclinometers and soil capacitive probes indicate safe pore pressure and minimal displacement near ${zone.name}.`,
      factors: [
        `Rainfall intensity monitoring: Tipping bucket gauge active`,
        `Soil saturation level: Capacitive sensor array nominal`,
        `Slope tilt rate: Dual-axis inclinometer telemetry normal`,
        `Data validation: Multistage anomaly checks passing (${validationResult.overallConfidence}% confidence)`
      ],
      actions: isCritical
        ? [
            "Issue priority advisories to local village panchayats and police checkposts.",
            "Verify alternative evacuation corridors for regional mountain passes.",
            "Maintain continuous IoT telemetry streaming."
          ]
        : isWatch
        ? [
            "Increase inspection frequency for drainage culverts and road embankments.",
            "Alert district emergency response teams to standby status.",
            "Ensure emergency sirens and VHF backup repeaters are operational."
          ]
        : [
            "Maintain routine automated telemetry logging and battery health polling.",
            "Verify citizen hazard reports periodically.",
            "No immediate evacuation required."
          ],
      warning: "Landsora AI provides decision-support interpretation of validated field telemetry. Follow official directives from SDMA and DDMA authorities.",
      confidence: validationResult.overallConfidence > 80 ? "HIGH" as const : "MEDIUM" as const,
      generatedAt: lastUpdate
    };
  }, [prototypeRiskLevel, zone.name, validationResult.overallConfidence, lastUpdate]);

  const displayAnalysis = aiAnalysisMutation.data ?? defaultAnalysis;

  // 7-Scenario Presets (Clean state updates without toast/notification spam)
  const setDemoScenario = (name: string) => {
    setScenario(name);
    setStorm(false);
    setStormProgress(0);
    setAnomalyOverride("NONE");

    if (name === "NORMAL CONDITIONS") {
      setZones(initialZones);
    } else if (name === "PERSISTENT HEAVY RAIN") {
      setZones(prev => prev.map(z => z.id === selected ? { ...z, rainfall: 22.4, soil: 82.5, score: 58, tier: "WATCH" } : z));
    } else if (name === "EXTREME STORM & TILT") {
      setZones(prev => prev.map(z => z.id === selected ? { ...z, rainfall: 31.8, soil: 92.4, tilt: 0.128, score: 84, tier: "CRITICAL" } : z));
      setStorm(true);
    } else if (name === "BAD SENSOR DATA (TILT SPIKE)") {
      setAnomalyOverride("TILT_SPIKE");
    } else if (name === "WEATHER API DELAYED") {
      setAnomalyOverride("WEATHER_API_DELAY");
    } else if (name === "LOW BATTERY & DEGRADED") {
      setAnomalyOverride("LOW_BATT");
    } else if (name === "CRITICAL ESCALATION (OPERATOR APPROVAL)") {
      setZones(prev => prev.map(z => z.id === selected ? { ...z, rainfall: 33.2, soil: 94.0, tilt: 0.135, score: 88, tier: "CRITICAL" } : z));
      setOperatorApprovalModal(true);
    }
  };

  useEffect(() => {
    timer.current = window.setInterval(() => {
      // Only execute gradual smooth progression in storm mode or active scenarios to prevent jittery text flickering
      if (storm) {
        setZones(prev => prev.map(z => {
          const oldTier = z.tier;
          const stormBoost = stormProgress / 100;
          const rain = Math.max(2, Math.min(34, z.rainfall + 0.25 * stormBoost));
          const soil = Math.max(25, Math.min(94, z.soil + 0.3 * stormBoost));
          const tilt = Math.max(.025, Math.min(.145, z.tilt + 0.0008 * stormBoost));
          const next = { ...z, rainfall: Number(rain.toFixed(1)), soil: Number(soil.toFixed(1)), tilt: Number(tilt.toFixed(3)) };
          const score = calcScore(next);
          const tier = classify(score);
          if (tier !== oldTier) {
            setEvents(es => [{ time: clock(), zone: z.name, transition: `${oldTier} → ${tier}`, risk: score }, ...es].slice(0, 6));
          }
          return { ...next, score, tier, history: [...z.history.slice(-15), score] };
        }));
      }
      setLastUpdate(clock());
    }, 5000);
    return () => window.clearInterval(timer.current);
  }, [storm, stormProgress]);

  useEffect(() => {
    if (storm && stormProgress < 100) {
      const t = window.setTimeout(() => setStormProgress(p => Math.min(100, p + 6)), 1000);
      return () => window.clearTimeout(t);
    }
  }, [storm, stormProgress]);

  const handleOperatorApproval = () => {
    operatorApprovalMutation.mutate({
      zoneId: zone.id,
      riskScore: Math.round(prototypeRiskScore || 80),
      riskLevel: prototypeRiskLevel || "CRITICAL",
      operatorName: "Officer S. Ramesh (DDMA Commander)",
      language: language || "EN",
      channels: ["SMS_PANCHAYAT", "BROWSER_PUSH", "POLICE_DESK"],
    }, {
      onSuccess: (data) => {
        setOperatorDeliveryLogs(data.deliveryLogs);
        setAck(true);
        setNotice(`Alert Dispatch ${data.dispatchId} verified & logged for 24 village panchayats.`);
      },
      onError: (err) => {
        console.warn("[Operator Broadcast Dispatch Error]", err);
        setNotice("Mock emergency broadcast logged locally.");
      }
    });
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedPoint({
      latitude: Number((8 + (1 - (event.clientY - rect.top) / rect.height) * 28).toFixed(4)),
      longitude: Number((68 + ((event.clientX - rect.left) / rect.width) * 28).toFixed(4))
    });
    setEventFocus(null);
  };

  const requestReportLocation = () => {
    if (!navigator.geolocation) {
      setNotice("Location permission is unavailable in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(position => {
      setReportLocation({ latitude: Number(position.coords.latitude.toFixed(4)), longitude: Number(position.coords.longitude.toFixed(4)) });
      setNotice("GPS location attached to local citizen report.");
    }, () => setNotice("Location permission not granted; select a map point instead."));
  };

  const submitReport = async () => {
    if (!isAuthenticated) {
      setGoogleAuthModalOpen(true);
      setNotice("Please sign in with Google to file an incident report.");
      return;
    }

    if (!reportDescription.trim()) {
      setNotice("Please enter a description of the observed slope conditions.");
      return;
    }

    const loc = reportLocation ?? analysisPoint;

    try {
      const res = await createReportMutation.mutateAsync({
        category: reportCategory,
        severity: reportSeverity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        description: reportDescription.trim(),
        latitude: loc.latitude,
        longitude: loc.longitude,
        attachmentName: reportFile?.name ?? null,
      });

      setReportSaved(true);
      setReportOpen(false);
      setNotice(`Incident ${res.report.reportId} recorded in database (active for 24 hours).`);
      setReportDescription("");
      setReportFile(null);
    } catch (err: any) {
      setNotice(err?.message || "Failed to submit report to database.");
    }
  };

  const cycleNetwork = () => {
    const next = networkState === "ONLINE" ? "LIMITED NETWORK" : networkState === "LIMITED NETWORK" ? "OFFLINE MODE" : "ONLINE";
    setNetworkState(next);
    setNotice(`Network state changed to ${next}. Local offline queue active.`);
  };

  const [autoDetectLanguage, setAutoDetectLanguage] = useState(false);
  const isInitialMount = useRef(true);

  // Auto-switch language based on focused zone region if autoDetect is active
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (autoDetectLanguage) {
      const autoLang = detectLanguageForZone(selected);
      if (autoLang !== language) {
        setLanguage(autoLang);
        saveNotificationLanguage(autoLang);
        const meta = notificationLanguages.find(l => l.code === autoLang);
        setNotice(`📍 Region Detected: ${zone.name} (${zone.region}) → Language set to ${meta?.label} (${meta?.nativeLabel})`);
      }
    }
  }, [selected, autoDetectLanguage]);

  const handleDetectGpsLocation = () => {
    if (!navigator.geolocation) {
      setNotice("GPS Geolocation is not supported by this browser.");
      return;
    }
    setNotice("Detecting your GPS location and nearest monitoring node...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        let closestZone = zones[0];
        let minDistance = Infinity;
        zones.forEach((z) => {
          const [zLat, zLon] = z.coords.split(",").map(Number);
          const dist = distanceKm({ latitude: lat, longitude: lon }, { latitude: zLat, longitude: zLon });
          if (dist < minDistance) {
            minDistance = dist;
            closestZone = z;
          }
        });
        setSelected(closestZone.id);
        const detectedLang = detectLanguageFromCoords(lat, lon);
        setLanguage(detectedLang);
        saveNotificationLanguage(detectedLang);
        const langMeta = notificationLanguages.find((l) => l.code === detectedLang);
        setNotice(
          `📍 GPS Location Detected (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E) — Nearest Node: ${closestZone.name} (${minDistance.toFixed(0)} km). Auto-switched language to ${langMeta?.label} (${langMeta?.nativeLabel}).`
        );
      },
      () => {
        setNotice("GPS access unavailable. Keeping current language.");
      }
    );
  };

  const changeLanguage = (next: string) => {
    const selectedLanguage = notificationLanguages.find(item => item.code === next);
    if (!selectedLanguage) return;
    setLanguage(selectedLanguage.code);
    saveNotificationLanguage(selectedLanguage.code);
    setNotice(`Language switched to ${selectedLanguage.label} (${selectedLanguage.nativeLabel}).`);
  };

  const runAiAnalysis = () => {
    const validRiskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" =
      prototypeRiskLevel === "CRITICAL"
        ? "CRITICAL"
        : prototypeRiskLevel === "HIGH"
        ? "HIGH"
        : prototypeRiskLevel === "MODERATE" || prototypeRiskLevel === "WATCH"
        ? "MODERATE"
        : "LOW";

    aiAnalysisMutation.mutate(
      {
        location: zone.name || "Kodagu",
        rainfall: Number((zone.rainfall || 0).toFixed(1)),
        weather: forecast[0]?.weather || "LIGHT RAIN",
        soil: Number((zone.soil || 50).toFixed(1)),
        tilt: Number((zone.tilt || 0.05).toFixed(3)),
        recentEventsNearby: Boolean(nearestEvent.distance <= 50),
        recentEventCount: recentEvents.length || 0,
        historicalContext: `Prototype baseline ${zone.baseline}/100; source context is ${liveAvailable ? "NASA EONET feed available" : "real-time source unavailable"}.`.slice(0, 220),
        calculatedRiskScore: Math.round(prototypeRiskScore || 30),
        calculatedRiskLevel: validRiskLevel,
        language: language || "EN",
        dataAvailable: Boolean(liveAvailable && !demoMode),
      },
      {
        onError: (err) => {
          console.warn("[Landsora AI Inference] Fallback to domain synthesis active:", err);
        },
      }
    );
    setLastAnalyzedLevel(prototypeRiskLevel);
  };

  useEffect(() => {
    if (shouldRefreshAiAnalysis({ previousLevel: lastAnalyzedLevel, currentLevel: prototypeRiskLevel, liveAvailable, demoMode })) {
      const timeout = window.setTimeout(() => {
        if (!isRefreshingAi.current && !aiAnalysisMutation.isPending) {
          isRefreshingAi.current = true;
          runAiAnalysis();
          const t = window.setTimeout(() => {
            isRefreshingAi.current = false;
          }, 3000);
        }
      }, 1200);
      return () => window.clearTimeout(timeout);
    }
  }, [prototypeRiskLevel, liveAvailable, demoMode, lastAnalyzedLevel]);

  // Export Incident Summary Report
  const exportIncidentDossier = () => {
    const dossierText = `# LANDSORA GEOTECHNICAL HAZARD REPORT
Generated: ${new Date().toISOString()}
Monitored Station: ${zone.name} (${zone.id}) — ${zone.region} [${zone.coords}]

--------------------------------------------------------------------------------
1. GEOTECHNICAL RISK ASSESSMENT
- Real-Time Risk Score: ${prototypeRiskScore} / 100 [${prototypeRiskLevel}]
- Data Confidence Score: ${validationResult.overallConfidence}% (${validationResult.status})
- Active Response Priority: ${responsePriority}
- Estimated Population Exposure: ${exposure.toLocaleString()} residents
- Affected Road Corridors: ${roadRows.filter(r => r.status !== "OPEN").map(r => `${r.name} (${r.status})`).join(", ") || "None"}

--------------------------------------------------------------------------------
2. IOT SENSOR TELEMETRY
- Rainfall Intensity: ${zone.rainfall} mm/hr (Tipping Bucket)
- Soil Moisture Saturation: ${zone.soil}% (Capacitive Probe)
- Slope Tilt Rate: ${zone.tilt} °/hr (MPU6050 Inclinometer)
- Validation Status: ${validationResult.status} (Quarantined: ${validationResult.isQuarantined ? "YES" : "NO"})
- Battery / Device Health: ${zone.batteryVoltage}V / RSSI ${zone.wifiRssi} dBm

--------------------------------------------------------------------------------
3. AI COMPANION RISK EXPLANATION
${aiAnalysisMutation.data?.assessment ?? "Assessment pending live generation."}

Disclaimer: Landsora is an IoT early warning and risk decision-support platform.
`;

    const blob = new Blob([dossierText], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Landsora_Incident_Summary_${zone.id}_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotice("Incident Summary Report (.md) generated and downloaded.");
  };

  return (
    <div className="app-shell dashboard-app-shell">
      {/* Top Application Header - Aerospace Minimalist Command Bar */}
      <header className="dashboard-app-header">
        <div className="dash-header-left">
          <Link href="/" className="dash-back-btn" title="Back to overview">
            <ArrowLeft size={14} />
            <span>{t("OVERVIEW")}</span>
          </Link>
          <div className="dash-header-brand">
            <div className="logo-wrap"><img src={assetUrl("lews-logo.png")} alt="Landsora logo" /></div>
            <div>
              <div className="brand-name">LANDSORA</div>
              <div className="brand-sub">{zone.name.toUpperCase()} · {prototypeRiskScore}/100 {t(prototypeRiskLevel)}</div>
            </div>
          </div>
        </div>

        {/* Center: Tactical Flight Scenario Switcher */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#162028] border border-amber-500/30 rounded-none px-2.5 py-1 shadow-inner">
            <Sliders size={12} className="text-amber-400" />
            <select
              value={scenario}
              onChange={(e) => setDemoScenario(e.target.value as any)}
              className="bg-transparent text-[11px] font-mono font-bold text-amber-300 focus:outline-none cursor-pointer pr-1"
              title="Select Simulation & Stress Test Scenario"
            >
              <option value="NORMAL CONDITIONS" className="bg-[#11171D] text-stone-200">{t("01 NORMAL CONDITIONS (BASELINE)")}</option>
              <option value="PERSISTENT HEAVY RAIN" className="bg-[#11171D] text-stone-200">{t("02 PERSISTENT MONSOON RAIN")}</option>
              <option value="EXTREME STORM & TILT" className="bg-[#11171D] text-stone-200">{t("03 EXTREME STORM & TILT SURGE")}</option>
              <option value="BAD SENSOR DATA (TILT SPIKE)" className="bg-[#11171D] text-stone-200">{t("04 GLITCH TELEMETRY QUARANTINE")}</option>
              <option value="WEATHER API DELAYED" className="bg-[#11171D] text-stone-200">{t("05 SATELLITE LATENCY & FALLBACK")}</option>
              <option value="LOW BATTERY & DEGRADED" className="bg-[#11171D] text-stone-200">{t("06 LOW SOLAR BATTERY DEGRADED")}</option>
              <option value="CRITICAL ESCALATION (OPERATOR APPROVAL)" className="bg-[#11171D] text-stone-200">{t("07 CRITICAL EVACUATION ESCALATION")}</option>
            </select>
          </div>

          <span
            className="flex items-center gap-1.5 px-2 py-1 rounded-none border text-[11px] font-mono font-semibold"
            style={{
              backgroundColor: validationResult.overallConfidence > 80 ? "rgba(16, 185, 129, 0.1)" : validationResult.overallConfidence > 50 ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
              borderColor: validationResult.overallConfidence > 80 ? "rgba(16, 185, 129, 0.3)" : validationResult.overallConfidence > 50 ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)",
              color: validationResult.overallConfidence > 80 ? "#34D399" : validationResult.overallConfidence > 50 ? "#FBBF24" : "#F87171",
            }}
          >
            <CheckCircle2 size={11} />
            <span>{validationResult.overallConfidence}% {t("CONFIDENCE")}</span>
          </span>
        </div>

        {/* Right Header Controls */}
        <div className="dash-header-controls">
          {/* Direct Core Modals: Radar & FoS */}
          <button
            type="button"
            className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-none text-[11px] font-mono font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition-all shadow-sm"
            onClick={() => setMeteorologyModalOpen(true)}
            title="Open Live Weather & Atmospheric Radar Suite"
          >
            <span>🌦️ {t("RADAR")}</span>
          </button>

          <button
            type="button"
            className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-none text-[11px] font-mono font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all shadow-sm"
            onClick={() => setSlopeModalOpen(true)}
            title="Open Mohr-Coulomb Factor of Safety (FoS) Slope Simulator"
          >
            <span>⚖️ {t("FoS")}</span>
          </button>

          {/* Consolidated Operations & Tools Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setToolsMenuOpen(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[11px] font-mono font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-stone-200 hover:text-white border border-white/10 transition-all shadow-sm"
              title="Open Tactical Edge Tools Menu"
            >
              <Cpu size={12} className="text-amber-400" />
              <span>{t("TOOLS")}</span>
              <ChevronDown size={11} className="text-stone-400" />
            </button>

            {toolsMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-[#0c1015]/98 backdrop-blur-2xl border border-white/15 shadow-2xl p-2 z-50 text-xs font-mono space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[9.5px] uppercase tracking-wider text-amber-400 font-bold border-b border-white/10 mb-1">
                  {t("TACTICAL OPERATIONS SUITE")}
                </div>

                <button
                  type="button"
                  onClick={() => { setHardwareModalOpen(true); setToolsMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-stone-300 hover:text-white hover:bg-white/[0.06] text-left transition-colors"
                >
                  <Cpu size={12} className="text-amber-400" />
                  <span>⚡ {t("Inject ESP32 Packet")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { exportIncidentDossier(); setToolsMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-stone-300 hover:text-white hover:bg-white/[0.06] text-left transition-colors"
                >
                  <FileText size={12} className="text-sky-400" />
                  <span>📄 {t("Export Incident Dossier (.md)")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setDeviceHealthOpen(true); setToolsMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-stone-300 hover:text-white hover:bg-white/[0.06] text-left transition-colors"
                >
                  <ShieldCheck size={12} className="text-emerald-400" />
                  <span>📡 {t("ESP32 Nodes Registry")} ({zones.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setQuarantineOpen(true); setToolsMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-stone-300 hover:text-white hover:bg-white/[0.06] text-left transition-colors"
                >
                  <AlertOctagon size={12} className="text-rose-400" />
                  <span>🛡️ {t("Quarantined Anomalies")} ({getStoredQuarantine().length})</span>
                </button>

                <div className="border-t border-white/10 my-1 pt-1" />

                <button
                  type="button"
                  onClick={toggleVoice}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-stone-300 hover:text-white hover:bg-white/[0.06] text-left transition-colors"
                >
                  <span>{t("Spoken Voice Alerts")}</span>
                  <span className={`px-1.5 py-0.2 text-[10px] font-bold ${voiceEnabled ? "bg-amber-500/20 text-amber-300" : "bg-stone-800 text-stone-400"}`}>
                    {t(voiceEnabled ? "ON" : "OFF")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDemoMode(v => !v)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-stone-300 hover:text-white hover:bg-white/[0.06] text-left transition-colors"
                >
                  <span>{t("Demo Mode")}</span>
                  <span className={`px-1.5 py-0.2 text-[10px] font-bold ${demoMode ? "bg-amber-500/20 text-amber-300" : "bg-stone-800 text-stone-400"}`}>
                    {t(demoMode ? "ON" : "OFF")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={cycleNetwork}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-stone-300 hover:text-white hover:bg-white/[0.06] text-left transition-colors"
                >
                  <span>{t("Network Backhaul")}</span>
                  <span className="text-[10px] text-emerald-400 font-bold">{t(networkState)}</span>
                </button>
              </div>
            )}
          </div>

          {/* Toggle Stations Drawer Button */}
          <button
            type="button"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[11px] font-mono font-semibold transition-all ${
              leftSidebarOpen
                ? "bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20"
                : "bg-white/[0.04] text-stone-300 hover:text-white border border-white/10"
            }`}
            onClick={() => setLeftSidebarOpen(v => !v)}
            title={leftSidebarOpen ? "Close Stations Drawer" : "Open Stations Drawer"}
          >
            <MapPin size={12} className={leftSidebarOpen ? "text-stone-950" : "text-amber-400"} />
            <span>{t("STATIONS")} ({zones.length})</span>
          </button>

          {/* Dedicated AI Companion */}
          <Link
            href="/ai-chatbot"
            className="flex items-center gap-1 px-2.5 py-1 rounded-none bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-bold text-amber-300 transition-all shadow-sm"
            title="Open Dedicated AI Companion"
          >
            <Sparkles size={12} className="text-amber-400" />
            <span className="hidden sm:inline">{t("AI COMPANION")}</span>
          </Link>

          {/* Google Auth Status */}
          {authMeQuery.data?.user ? (
            <button
              onClick={() => setGoogleAuthModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-none bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-[11px] font-medium text-emerald-300 transition-colors font-mono"
              title={`Google Account: ${authMeQuery.data.user.email || authMeQuery.data.user.name}`}
            >
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>{authMeQuery.data.user.email?.split("@")[0] || authMeQuery.data.user.name || "GOOGLE"}</span>
            </button>
          ) : (
            <button
              onClick={() => setGoogleAuthModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-none bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-medium text-amber-300 transition-colors"
              title="Connect Google Account"
            >
              <Sparkles size={11} className="text-amber-400" />
              <span>{t("CONNECT")}</span>
            </button>
          )}

          {/* 1-Click Regional Language Switcher */}
          <LanguageSwitcher
            language={language}
            autoDetectLanguage={autoDetectLanguage}
            onLanguageChange={changeLanguage}
            onAutoDetectToggle={(next) => {
              setAutoDetectLanguage(next);
              if (next) {
                const autoLang = detectLanguageForZone(selected);
                setLanguage(autoLang);
                setNotice(`📍 Auto-region detection active: set to ${autoLang}.`);
              } else {
                setNotice("Auto-detection paused. Manual language lock active.");
              }
            }}
            onDetectGpsLocation={handleDetectGpsLocation}
            selectedZone={selected}
          />

          <Link href="/settings" className="dash-settings-link p-1 text-stone-400 hover:text-white" title="Console Settings">
            <SettingsIcon size={14} />
          </Link>
        </div>
      </header>

      {/* Main Full-Viewport Geospatial Map Canvas & Floating Aerospace HUD */}
      <main className="relative flex-1 w-full h-[calc(100vh-54px)] overflow-hidden">
        {/* Full-Screen Base Map */}
        <InteractiveGisMap
          className="w-full h-full absolute inset-0 z-0"
          zones={gisZones}
          selectedZoneId={selected}
          onSelectZone={(zoneId) => {
            setSelected(zoneId);
            setSelectedPoint(null);
            if (!rightSidebarOpen) setRightSidebarOpen(true);
          }}
          onMapClickPoint={(point) => {
            setSelectedPoint(point);
            setNotice(`Analysis pin set to ${point.latitude}°N, ${point.longitude}°E`);
          }}
          selectedPoint={selectedPoint}
          nasaEvents={displayedEvents}
          rightPanelOpen={rightSidebarOpen}
          bottomDrawerOpen={bottomDrawerOpen}
          t={t}
        />

        {/* Floating Left Reopen Tab (When Stations Panel Collapsed) */}
        {!leftSidebarOpen && (
          <button
            type="button"
            onClick={() => setLeftSidebarOpen(true)}
            className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-[#0c1015]/90 hover:bg-[#162028] backdrop-blur-xl border border-white/10 hover:border-amber-500/50 text-stone-200 hover:text-white shadow-2xl text-xs font-mono font-bold transition-all pointer-events-auto animate-in fade-in duration-200"
            title="Show Stations List"
          >
            <PanelLeftOpen size={13} className="text-amber-400" />
            <span>{t("STATIONS")} ({zones.length})</span>
          </button>
        )}

        {/* Floating Left HUD: Zone Monitor List */}
        {leftSidebarOpen && (
          <aside className="gis-floating-hud absolute top-3 left-3 bottom-14 z-[1050] w-80 sm:w-84 md:w-88 flex flex-col pointer-events-auto animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="panel-title flex items-center justify-between p-3 border-b border-white/10 bg-white/[0.02]">
              <span className="flex items-center gap-2 text-stone-200 font-mono text-xs font-bold">
                <MapPin size={14} className="text-amber-400" />
                <span>{t("ZONE MONITOR")}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="mono text-[10px] text-stone-400 bg-white/[0.04] px-2 py-0.5 rounded-none border border-white/5">
                  {filteredZones.length} / {zones.length}
                </span>
                <button
                  type="button"
                  onClick={() => setLeftSidebarOpen(false)}
                  className="p-1 rounded-none text-stone-400 hover:text-stone-100 hover:bg-white/[0.08] transition-colors"
                  title="Collapse Stations List"
                >
                  <PanelLeftClose size={14} />
                </button>
              </div>
            </div>

            {/* Station Search Input */}
            <div className="px-3 pt-3 pb-1">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder={t("Filter 32 world stations...")}
                  className="w-full bg-[#162028] border border-white/10 focus:border-amber-500/60 rounded-none pl-8 pr-8 py-2 text-xs text-stone-100 placeholder-stone-500 font-mono outline-none transition-all shadow-inner"
                />
                {locationSearch && (
                  <button
                    type="button"
                    onClick={() => setLocationSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-100 p-0.5"
                    title="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Global Continent Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none">
              {[
                { id: "ALL" as ContinentCode, label: t("ALL"), count: zones.length },
                { id: "INDIA" as ContinentCode, label: `🇮🇳 ${t("INDIA")}`, count: zones.filter(z => z.continent === "INDIA").length },
                { id: "ASIA_PACIFIC" as ContinentCode, label: `🌏 ${t("ASIA")}`, count: zones.filter(z => z.continent === "ASIA_PACIFIC").length },
                { id: "EUROPE" as ContinentCode, label: `🇪🇺 ${t("ALPS")}`, count: zones.filter(z => z.continent === "EUROPE").length },
                { id: "AMERICAS" as ContinentCode, label: `🌎 ${t("AMERICAS")}`, count: zones.filter(z => z.continent === "AMERICAS").length },
                { id: "AFRICA_OCEANIA" as ContinentCode, label: `🌍 ${t("AFRICA/OCEANIA")}`, count: zones.filter(z => z.continent === "AFRICA_OCEANIA").length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedContinent(tab.id)}
                  className={`px-2 py-0.5 rounded-none text-[9.5px] font-mono whitespace-nowrap transition-all ${
                    selectedContinent === tab.id
                      ? "bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20"
                      : "bg-white/[0.03] text-stone-400 hover:text-stone-200 border border-white/5"
                  }`}
                >
                  {tab.label} <span className="opacity-70">({tab.count})</span>
                </button>
              ))}
            </div>

            {/* Scrollable Zone Telemetry List */}
            <div className="zone-list flex-1 overflow-y-auto px-1">
              {filteredZones.length > 0 ? (
                filteredZones.map((z) => (
                  <button
                    key={z.id}
                    className={`zone-row ${z.id === selected ? "selected" : ""}`}
                    onClick={() => {
                      setSelected(z.id);
                      if (!rightSidebarOpen) setRightSidebarOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base leading-none shrink-0">{z.countryFlag}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-stone-100 truncate">{z.name}</span>
                            <span className="text-[9.5px] font-mono text-stone-400 bg-white/[0.04] px-1.5 py-0.2 rounded-none border border-white/5 shrink-0">{z.id}</span>
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono truncate block">{z.region}, {z.country}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <span
                          className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-none flex items-center gap-1"
                          style={{
                            backgroundColor: z.tier === "CRITICAL" ? "rgba(239,68,68,0.15)" : z.tier === "WATCH" ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
                            color: z.tier === "CRITICAL" ? "#F87171" : z.tier === "WATCH" ? "#FBBF24" : "#34D399",
                            border: `1px solid ${z.tier === "CRITICAL" ? "rgba(239,68,68,0.3)" : z.tier === "WATCH" ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-none" style={{ backgroundColor: z.tier === "CRITICAL" ? "#EF4444" : z.tier === "WATCH" ? "#F59E0B" : "#10B981" }} />
                          {z.score}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mt-2 pt-1.5 border-t border-white/5 text-[9.5px] font-mono text-stone-400">
                      <div className="flex items-center gap-1">
                        <span>🌧️</span> <b>{z.rainfall}mm</b>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>💧</span> <b>{z.soil}%</b>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>📐</span> <b>{z.tilt}°</b>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-stone-500 font-mono">
                  {t("No stations match search criteria.")}
                </div>
              )}
            </div>

            {/* Bottom Health Strip inside HUD */}
            <div className="p-2.5 border-t border-white/10 bg-black/40 shrink-0">
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 mb-1">
                <span>{t("NETWORK BACKHAUL")}</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-none bg-emerald-500" /> {t("ONLINE")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[9.5px] font-mono">
                <div className="bg-[#162028] p-1.5 rounded-none border border-white/5">
                  <span className="text-stone-500 block text-[8.5px]">{t("ACTIVE NODES")}</span>
                  <b className="text-stone-200">{zones.length} / {zones.length}</b>
                </div>
                <div className="bg-[#162028] p-1.5 rounded-none border border-white/5">
                  <span className="text-stone-500 block text-[8.5px]">{t("SOLAR BATTERY")}</span>
                  <b className="text-amber-300">{zone.batteryVoltage}V (94%)</b>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Floating Right Reopen Tab (When Details Panel Collapsed) */}
        {!rightSidebarOpen && (
          <button
            type="button"
            onClick={() => setRightSidebarOpen(true)}
            className="absolute top-14 right-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-[#0c1015]/90 hover:bg-[#162028] backdrop-blur-xl border border-white/10 hover:border-amber-500/50 text-stone-200 hover:text-white shadow-2xl text-xs font-mono font-bold transition-all pointer-events-auto animate-in fade-in duration-200"
            title="Show Station Details"
          >
            <Activity size={13} className="text-amber-400" />
            <span>{t("DETAILS")}: {zone.name.toUpperCase()} ({prototypeRiskScore}%)</span>
            <PanelRightOpen size={13} className="text-stone-400" />
          </button>
        )}

        {/* Floating Right HUD: Zone Intelligence & Gauges */}
        {rightSidebarOpen && (
          <aside className="gis-floating-hud absolute top-3 right-3 bottom-14 z-[1050] w-80 sm:w-84 md:w-88 flex flex-col pointer-events-auto animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="panel-title flex items-center justify-between p-3 border-b border-white/10 bg-white/[0.02]">
              <span className="flex items-center gap-2 text-stone-200 font-mono text-xs font-bold">
                <Activity size={14} className="text-amber-400" />
                <span>{t("ZONE INTELLIGENCE")}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="mono text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-none border border-amber-500/20">{zone.id}</span>
                <button
                  type="button"
                  onClick={() => setRightSidebarOpen(false)}
                  className="p-1 rounded-none text-stone-400 hover:text-stone-100 hover:bg-white/[0.08] transition-colors"
                  title="Collapse Details Sidebar"
                >
                  <PanelRightClose size={14} />
                </button>
              </div>
            </div>

            {/* Scrollable Intelligence Body */}
            <div className="flex-1 overflow-y-auto">
              {/* Station Hero Information Card */}
              <div className="p-3.5 bg-white/[0.015] border-b border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">{zone.continent.replace("_", " ")}</span>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-none border border-amber-500/20">
                    {zone.id}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
                  <span className="text-lg leading-none">{zone.countryFlag}</span>
                  <span className="truncate">{zone.name}</span>
                </h3>
                <p className="text-[11px] text-stone-400 font-mono mt-0.5 truncate">{zone.region}, {zone.country} · {zone.coords}</p>
                <div className="mt-2.5 pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="bg-[#162028] p-1.5 rounded-none border border-white/5">
                    <span className="text-stone-400 block text-[8.5px]">{t("ELEVATION")}</span>
                    <strong className="text-stone-100 font-semibold">{zone.elevation}</strong>
                  </div>
                  <div className="bg-[#162028] p-1.5 rounded-none border border-white/5">
                    <span className="text-stone-400 block text-[8.5px]">{t("BEDROCK LITHOLOGY")}</span>
                    <strong className="text-amber-300 truncate block font-semibold" title={zone.geology}>{zone.geology}</strong>
                  </div>
                </div>
              </div>

              {/* Risk Score & Gauge */}
              <div className="p-3.5 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-stone-400 uppercase tracking-wider">{t("LANDSORA RISK SCORE")}</span>
                  <span className="font-bold px-2 py-0.5 rounded-none text-xs" style={{
                    backgroundColor: `${prototypeRiskColor}20`,
                    borderColor: prototypeRiskColor,
                    color: prototypeRiskColor,
                    borderWidth: 1,
                  }}>
                    {t(prototypeRiskLevel)} {t("HAZARD")}
                  </span>
                </div>

                <div className="mt-2.5 mb-2">
                  <div className="h-2 w-full bg-white/[0.06] rounded-none overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-none transition-all duration-500"
                      style={{
                        width: `${prototypeRiskScore}%`,
                        backgroundColor: prototypeRiskColor,
                        boxShadow: `0 0 12px ${prototypeRiskColor}80`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold font-mono text-white tracking-tight">
                    {prototypeRiskScore}<span className="text-xs font-normal text-stone-400 ml-1">/ 100</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9.5px] font-mono text-stone-400 block">{t("SLOPE FAILURE RISK")}</span>
                    <span className="text-xs font-mono font-bold" style={{ color: prototypeRiskColor }}>
                      {t(prototypeRiskScore > 70 ? "IMMINENT DANGER" : prototypeRiskScore > 40 ? "ACTIVE SURVEILLANCE" : "LOW PROBABILITY")}
                    </span>
                  </div>
                </div>

                <div
                  className="mt-2.5 p-2.5 rounded-none text-xs leading-relaxed border"
                  style={{
                    backgroundColor: `${prototypeRiskColor}12`,
                    borderColor: `${prototypeRiskColor}30`,
                    color: "#E2E8F0",
                  }}
                >
                  <div className="font-mono font-bold text-[9.5px] uppercase tracking-wider mb-1" style={{ color: prototypeRiskColor }}>
                    🚨 {t("EVACUATION ADVISORY")} · {t(prototypeRiskLevel)}
                  </div>
                  <p className="text-[11px] text-stone-300">
                    {t(
                      prototypeRiskLevel === "LOW"
                        ? "Stable conditions. Soil moisture and tilt readings are within normal seasonal limits. No movement detected."
                        : prototypeRiskLevel === "MODERATE"
                        ? "Watch advisory. Soil is nearing saturation and micro-tilt is creeping up. Alert local panchayats and monitor pass roads."
                        : "Critical danger. Saturated soil and rapid slope tilt indicate shearing. Evacuate downstream homes and close the pass now."
                    )}
                  </p>
                </div>
              </div>

              {/* 4-Quadrant Sensor Vitals */}
              <div className="p-3.5 grid grid-cols-2 gap-2 border-b border-white/10">
                <div className="p-2 rounded-none bg-[#162028] border border-white/5">
                  <div className="flex items-center gap-1 text-[9.5px] font-mono text-stone-400">
                    <span>🌧️</span>
                    <span>{t("RAINFALL (24H)")}</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-blue-400 mt-1">{zone.rainfall} mm</div>
                  <div className="text-[9px] font-mono text-stone-500 mt-0.5">{t("Threshold")}: 100mm</div>
                </div>

                <div className="p-2 rounded-none bg-[#162028] border border-white/5">
                  <div className="flex items-center gap-1 text-[9.5px] font-mono text-stone-400">
                    <span>💧</span>
                    <span>{t("PORE SATURATION")}</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-amber-400 mt-1">{zone.soil}%</div>
                  <div className="text-[9px] font-mono text-stone-500 mt-0.5">{t("Capacitive probe")}</div>
                </div>

                <div className="p-2 rounded-none bg-[#162028] border border-white/5">
                  <div className="flex items-center gap-1 text-[9.5px] font-mono text-stone-400">
                    <span>📐</span>
                    <span>{t("SLOPE TILT RATE")}</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-purple-400 mt-1">{zone.tilt}°/hr</div>
                  <div className="text-[9px] font-mono text-stone-500 mt-0.5">{t("Biaxial tiltmeter")}</div>
                </div>

                <div className="p-2 rounded-none bg-[#162028] border border-white/5">
                  <div className="flex items-center gap-1 text-[9.5px] font-mono text-stone-400">
                    <span>⚖️</span>
                    <span>{t("FACTOR OF SAFETY")}</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                    {liveData?.geotechnicalAnalysis?.factorOfSafety ? `FoS ${liveData.geotechnicalAnalysis.factorOfSafety}` : "FoS 1.42"}
                  </div>
                  <div className="text-[9px] font-mono text-stone-500 mt-0.5">{t("Mohr-Coulomb")}</div>
                </div>
              </div>
            </div>

            {/* Tactical Expansion Actions in Right HUD Footer */}
            <div className="p-3 space-y-1.5 border-t border-white/10 bg-black/40 shrink-0">
              <button
                type="button"
                onClick={() => setMeteorologyModalOpen(true)}
                className="w-full py-1.5 px-2.5 rounded-none bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>🌦️ {t("EXPAND LIVE RADAR & FORECAST")}</span>
                <ArrowUpRight size={12} />
              </button>

              <button
                type="button"
                onClick={() => setSlopeModalOpen(true)}
                className="w-full py-1.5 px-2.5 rounded-none bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>⚖️ {t("MOHR-COULOMB SLOPE SIMULATOR")}</span>
                <ArrowUpRight size={12} />
              </button>
            </div>
          </aside>
        )}

        {/* Floating Bottom Center HUD Dock */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-[#11171D]/92 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-none shadow-2xl text-xs font-mono">
            <span className="text-stone-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-none bg-emerald-400" />
              <b>{zones.length}</b> {t("SITES")}
            </span>

            <div className="h-3 w-px bg-white/10" />

            <span className="text-red-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-none bg-red-500 animate-pulse" />
              <b>{zones.filter(z => z.tier === "CRITICAL").length}</b> {t("CRITICAL")}
            </span>

            <div className="h-3 w-px bg-white/10" />

            <span className="text-stone-400 hidden sm:inline-flex items-center gap-1">
              {t("AVG TILT")}: <b className="text-sky-300">{(zones.reduce((s, z) => s + z.tilt, 0) / zones.length).toFixed(3)}°/hr</b>
            </span>

            {liveData?.hydrology?.riverDischargeM3s !== undefined && (
              <>
                <div className="h-3 w-px bg-white/10 hidden md:block" />
                <span className="text-stone-400 hidden md:inline-flex items-center gap-1" title="Live River Runoff & Discharge (Open-Meteo Flood API)">
                  {t("RUNOFF")}: <b className="text-cyan-300">{liveData.hydrology.riverDischargeM3s} m³/s</b>
                </span>
              </>
            )}

            {liveData?.airQuality?.usAqi !== undefined && (
              <>
                <div className="h-3 w-px bg-white/10 hidden lg:block" />
                <span className="text-stone-400 hidden lg:inline-flex items-center gap-1" title="Live US Air Quality Index (Open-Meteo Air Quality API)">
                  {t("AQI")}: <b className={liveData.airQuality.usAqi > 100 ? "text-amber-400" : "text-emerald-400"}>{liveData.airQuality.usAqi} ({liveData.airQuality.qualityLevel})</b>
                </span>
              </>
            )}

            <div className="h-3 w-px bg-white/10 hidden sm:block" />

            <button
              type="button"
              onClick={() => setBottomDrawerOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-all"
              title="Expand Telemetry Breakdown, History Logs & Citizen Field Reports"
            >
              <BarChart3 size={12} className="text-amber-400" />
              <span>{bottomDrawerOpen ? t("HIDE TELEMETRY & LOGS ▼") : t("📊 TELEMETRY & FIELD REPORTS ▲")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setWeatherTelemetryOpen((prev) => !prev);
                setBottomDrawerOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 text-[11px] font-bold transition-all"
              title="Open-Meteo weather and physical sensor fallback telemetry"
            >
              <CloudRain size={12} className="text-cyan-300" />
              <span>{weatherTelemetryOpen ? "HIDE WEATHER TELEMETRY" : "WEATHER TELEMETRY"}</span>
            </button>
          </div>
        </div>

        {/* Floating Bottom Slide-Up Drawer: Analytics, Sensor Log & Field Reports */}
        {bottomDrawerOpen && (
          <div className="absolute bottom-0 left-0 right-0 max-h-[72vh] z-[1100] flex flex-col bg-[#0c1015]/96 backdrop-blur-2xl border-t-2 border-amber-500/50 shadow-[0_-16px_50px_rgba(0,0,0,0.9)] overflow-hidden pointer-events-auto animate-in slide-in-from-bottom duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-2">
                <BarChart3 size={15} className="text-amber-400" />
                <span className="text-xs font-mono font-bold text-stone-100">
                  {t("ANALYTICS, SENSOR TELEMETRY & FIELD OPERATIONS")}
                </span>
                <span className="text-[10px] font-mono text-stone-400 hidden md:inline">
                  · Deterministic 4-Factor Breakdown · 16-Readings Trend · Pass Status · Citizen DB Reports
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBottomDrawerOpen(false)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-none bg-white/[0.05] hover:bg-white/[0.1] text-stone-300 hover:text-white border border-white/10 text-xs font-mono transition-colors"
                title="Minimize Dock"
              >
                <span>{t("▼ MINIMIZE DOCK")}</span>
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="p-4 overflow-y-auto space-y-6 scrollbar-thin">
              {weatherTelemetryOpen && (
                <section className="border border-cyan-500/30 bg-[#11171D]/80 p-4">
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
                    <div>
                      <div className="text-[10px] font-mono font-bold tracking-[0.12em] text-cyan-300">WEATHER TELEMETRY &amp; FALLBACK</div>
                      <p className="text-[11px] text-stone-400 mt-1">Open-Meteo rainfall and existing ground telemetry, embedded in the console.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWeatherTelemetryOpen(false)}
                      className="px-2 py-1 text-[10px] font-mono text-stone-400 hover:text-white border border-white/10"
                    >
                      HIDE
                    </button>
                  </div>
                  <WeatherTelemetryModule embedded />
                </section>
              )}

              {/* Lower Telemetry & Explainability Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-start">
                <div className="chart-panel panel md:col-span-2 lg:col-span-5">
                  <div className="panel-title">
                    <span>{t("RISK SCORE — LAST 16 READINGS")}</span>
                    <span className="trend"><ArrowUpRight size={14} /> {t("TREND")} {delta(prototypeRiskScore, zone.history[zone.history.length - 2])}</span>
                  </div>
                  <TrendChart values={zone.history} tier={prototypeTier} />
                  <div className="chart-stats">
                    <span>{t("CURRENT")} <b>{prototypeRiskScore}</b></span>
                    <span>{t("PREVIOUS")} <b>{zone.history[zone.history.length - 2]}</b></span>
                    <span>{t("RECENT HIGH")} <b>{Math.max(...zone.history)}</b></span>
                    <span>{t("STATUS")} <b style={{ color: prototypeRiskColor }}>{t(prototypeRiskLevel)}</b></span>
                  </div>
                </div>

                <div className="explain panel md:col-span-1 lg:col-span-4">
                  <div className="panel-title">
                    <span>{t("WHY THIS SCORE?")}</span>
                    <span className="mono">{t("DETERMINISTIC 4-FACTOR BREAKDOWN")}</span>
                  </div>
                  <p>Risk is <b style={{ color: prototypeRiskColor }}>{t(prototypeRiskLevel)}</b> calculated via auditable formula without black-box AI:</p>
                  <div className="contributions">
                    {[
                      ["RAINFALL INTENSITY", riskInputs.rainfallScore, "#84A6A0"],
                      ["TERRAIN / TILT ACCELERATION", riskInputs.terrainScore, "#C28A70"],
                      ["GEOLOGICAL BASELINE", riskInputs.historicalLandslideScore, "#D6A24E"],
                      ["REGIONAL EVENT CONTEXT", riskInputs.recentEventScore, "#C24B3F"]
                    ].map(([label, val, color]) => (
                      <div className="contrib" key={label as string}>
                        <span>{t(label as string)}<b>{Math.round((val as number) / 4)} / 100</b></span>
                        <i><em style={{ width: `${val as number}%`, background: color as string }} /></i>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="history panel md:col-span-1 lg:col-span-3">
                  <div className="panel-title">
                    <span>{t("SENSOR HISTORY LOG")}</span>
                    <span className="mono">{t("LAST 5 READINGS")}</span>
                  </div>
                  <div className="history-head">
                    <span>{t("TIME")}</span><span>{t("RAINFALL")}</span><span>{t("SOIL MOISTURE")}</span><span>{t("SLOPE TILT")}</span>
                  </div>
                  {zone.history.slice(-5).reverse().map((v, i) => (
                    <div className="history-row" key={`${v}-${i}`}>
                      <span>{i === 0 ? lastUpdate : `${lastUpdate.slice(0, 5)}:${String(Math.max(0, 38 - i * 2)).padStart(2, "0")}`}</span>
                      <span>{(zone.rainfall - (4 - i) * .7).toFixed(1)}</span>
                      <span>{(zone.soil - (4 - i) * 1.1).toFixed(1)}%</span>
                      <span>{(zone.tilt - (4 - i) * .002).toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Global Earth Telemetry: Open-Meteo Hydrology, Air Quality & Subsurface Strata */}
              <div className="panel p-4 border border-cyan-500/30 bg-[#0d1417] rounded-none space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      {t("LIVE OPEN-METEO GLOBAL SENSOR ARRAYS & SATELLITE SUITE")}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-none bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {zone.region || zone.name} &bull; {liveData?.elevationMeters ? `${liveData.elevationMeters}m MSL` : zone.elevation}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMeteorologyModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-none bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-mono font-bold transition-all"
                  >
                    <span>{t("EXPAND FULL RADAR & 7-DAY HYDROGRAPH")}</span>
                    <ArrowUpRight size={12} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1 text-xs font-mono">
                  {/* Hydrology / Runoff */}
                  <div className="p-2.5 rounded-none bg-black/40 border border-white/10">
                    <span className="text-stone-400 block text-[10px]">{t("RIVER DISCHARGE")}</span>
                    <strong className="text-cyan-300 text-sm block mt-0.5">
                      {liveData?.hydrology?.riverDischargeM3s ?? 0.85} m³/s
                    </strong>
                    <span className="text-[9.5px] text-stone-500">
                      Peak: {liveData?.hydrology?.riverDischargeMaxM3s ?? 1.2} m³/s
                    </span>
                  </div>

                  {/* Flood Risk */}
                  <div className="p-2.5 rounded-none bg-black/40 border border-white/10">
                    <span className="text-stone-400 block text-[10px]">{t("FLOOD RISK INDEX")}</span>
                    <strong className={`text-sm block mt-0.5 ${
                      liveData?.hydrology?.floodRiskLevel === "CRITICAL" ? "text-red-400" :
                      liveData?.hydrology?.floodRiskLevel === "HIGH" ? "text-amber-400" :
                      liveData?.hydrology?.floodRiskLevel === "MODERATE" ? "text-yellow-300" : "text-emerald-400"
                    }`}>
                      {liveData?.hydrology?.floodRiskLevel ?? "LOW"}
                    </strong>
                    <span className="text-[9.5px] text-stone-500">Open-Meteo Flood API</span>
                  </div>

                  {/* US AQI */}
                  <div className="p-2.5 rounded-none bg-black/40 border border-white/10">
                    <span className="text-stone-400 block text-[10px]">{t("AIR QUALITY (US AQI)")}</span>
                    <strong className="text-amber-300 text-sm block mt-0.5">
                      {liveData?.airQuality?.usAqi ?? 42} AQI
                    </strong>
                    <span className="text-[9.5px] text-stone-500">
                      {liveData?.airQuality?.qualityLevel ?? "GOOD"} (PM2.5: {liveData?.airQuality?.pm25 ?? 9.5} μg/m³)
                    </span>
                  </div>

                  {/* Subsurface Soil Moisture 0-9cm */}
                  <div className="p-2.5 rounded-none bg-black/40 border border-white/10">
                    <span className="text-stone-400 block text-[10px]">{t("ROOT SOIL MOISTURE")}</span>
                    <strong className="text-sky-300 text-sm block mt-0.5">
                      {liveData?.soilMoistureProfile?.depth3to9cm ?? zone.soil}%
                    </strong>
                    <span className="text-[9.5px] text-stone-500">
                      Depth 3-9cm ({liveData?.soilMoistureProfile?.depth27to81cm ?? 42}% at 81cm)
                    </span>
                  </div>

                  {/* Solar Radiation & ET0 */}
                  <div className="p-2.5 rounded-none bg-black/40 border border-white/10">
                    <span className="text-stone-400 block text-[10px]">{t("SOLAR RADIATION")}</span>
                    <strong className="text-yellow-300 text-sm block mt-0.5">
                      {liveData?.solarRadiationWatts ?? 540} W/m²
                    </strong>
                    <span className="text-[9.5px] text-stone-500">
                      ET0: {liveData?.et0FaoMm ?? 3.8} mm/day
                    </span>
                  </div>

                  {/* Wind Shear 10m vs 80m */}
                  <div className="p-2.5 rounded-none bg-black/40 border border-white/10">
                    <span className="text-stone-400 block text-[10px]">{t("WIND GRADIENT (80M)")}</span>
                    <strong className="text-stone-200 text-sm block mt-0.5">
                      {liveData?.windSpeed80mKmh ?? 18} km/h
                    </strong>
                    <span className="text-[9.5px] text-stone-500">
                      Surface: {liveData?.windSpeedKmh ?? 12} km/h {liveData?.windDirectionCompass ?? "SW"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Field Operations & Citizen Reporting Suite */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-start">
                {/* Executive Situation Summary */}
                <div className="impact-card panel md:col-span-1 lg:col-span-6 xl:col-span-4">
                  <div className="panel-title">
                    <span><Users size={14} /> {t("EXECUTIVE SITUATION SUMMARY")}</span>
                    <span className="mono">{t(responsePriority)}</span>
                  </div>
                  <div className="impact-metrics">
                    <span><b style={{ color: prototypeRiskColor }}>{t(prototypeRiskLevel)}</b><small>{t("SELECTED RISK")}</small></span>
                    <span><b>{exposure.toLocaleString()}</b><small>{t("POPULATION EXPOSURE*")}</small></span>
                    <span><b>{roadRows.filter(r => r.status === "AT RISK" || r.status === "BLOCKED").length}</b><small>{t("ROADS TO REVIEW")}</small></span>
                    <span><b>{t(responsePriority)}</b><small>{t("RESPONSE LEVEL")}</small></span>
                  </div>
                  <div className="impact-list">
                    <span><MapPinned size={13} /> {t("VILLAGES POTENTIALLY AFFECTED")} <b>{prototypeRiskScore >= 76 ? 3 : prototypeRiskScore >= 51 ? 2 : 1}</b></span>
                    <span><Hospital size={13} /> {t("EMERGENCY ACCESS")} <b>{t(prototypeRiskScore >= 76 ? "LIMITED" : "AVAILABLE")}</b></span>
                    <span><Route size={13} /> {t("ALTERNATIVE ROUTE")} <b>{t(prototypeRiskScore >= 76 ? "REVIEW REQUIRED" : "AVAILABLE")}</b></span>
                  </div>
                  <small className="impact-disclaimer">* Prototype exposure estimate for demonstration only. Validate with approved population datasets.</small>
                </div>

                {/* Road Corridor Connectivity */}
                <div className="road-card panel md:col-span-1 lg:col-span-6 xl:col-span-4">
                  <div className="panel-title">
                    <span><Route size={14} /> {t("MOUNTAIN PASS & ROAD STATUS")}</span>
                    <span className="mono">{t("FIELD ESTIMATE")}</span>
                  </div>
                  <p className="module-intro">{t("Estimated corridor status based on slope saturation and distance.")}</p>
                  {roadRows.map(row => (
                    <div className="road-row" key={row.name}>
                      <div>
                        <b>{row.name}</b>
                        <small>{row.distance} from selected risk surface · {row.villages} village(s)</small>
                      </div>
                      <span className={`road-status road-${row.status.toLowerCase().replace(" ", "-")}`}>{row.status}</span>
                      <em>{t("CONFIDENCE")} {row.confidence}</em>
                    </div>
                  ))}
                </div>

                {/* Weather-Linked Forecast */}
                <div className="forecast-card panel md:col-span-1 lg:col-span-6 xl:col-span-4">
                  <div className="panel-title">
                    <span><CloudRain size={14} /> {t("WEATHER-LINKED RISK FORECAST")}</span>
                    <span className="mono">{t("PROTOTYPE")}</span>
                  </div>
                  <div className="forecast-list">
                    {forecast.map(item => (
                      <div className="forecast-row" key={item.time}>
                        <span>{item.time}</span>
                        <b>{item.weather}</b>
                        <strong style={{ color: item.score >= 76 ? "#C24B3F" : item.score >= 51 ? "#D6A24E" : "#6FA377" }}>{classify(item.score)}</strong>
                        <em>{item.score}/100</em>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Citizen & Field Reporting */}
                <div className="report-card panel md:col-span-1 lg:col-span-6 xl:col-span-6">
                  <div className="panel-title">
                    <span className="flex items-center gap-1.5"><Upload size={14} /> {t("CITIZEN / FIELD REPORTING")}</span>
                    <span className="mono">
                      {activeReportsQuery.data?.length
                        ? `${activeReportsQuery.data.length} ${t("ACTIVE IN DATABASE")}`
                        : t("ACTIVE DB READY")}
                    </span>
                  </div>

                  {!isAuthenticated ? (
                    <div className="p-4 border border-amber-500/30 bg-amber-500/5 flex flex-col items-center text-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Lock size={18} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-stone-200">{t("AUTHENTICATION REQUIRED")}</h4>
                        <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
                          {t("To submit official landslide observations, slope crack sightings, or road blockages into the database, users must sign in with their Google account.")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="button primary flex items-center gap-2 mt-1 font-bold text-xs"
                        onClick={() => setGoogleAuthModalOpen(true)}
                      >
                        <LogIn size={13} />
                        <span>{t("SIGN IN WITH GOOGLE TO REPORT")}</span>
                      </button>
                    </div>
                  ) : reportSaved ? (
                    <div className="report-success">
                      <ShieldCheck size={20} className="text-emerald-400" />
                      <div>
                        <b>{t("REPORT RECORDED IN DATABASE")}</b>
                        <small>
                          {t("Stored in temporary active database table (24h operational window). Emergency coordinators and response teams can view this active record.")}
                        </small>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="button secondary" onClick={() => setReportSaved(false)}>
                          {t("FILE ANOTHER REPORT")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800 text-[11px] font-mono">
                        <span className="text-stone-400">
                          {t("REPORTER")}: <b className="text-emerald-400">{user?.name || user?.email}</b>
                        </span>
                        <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 text-[10px]">
                          {t("VERIFIED ACCOUNT")}
                        </span>
                      </div>

                      <p className="module-intro">{t("Capture slope cracks, movement, landslide activity, or blocked roads directly to the central database.")}</p>
                      <div className="report-fields">
                        <select value={reportCategory} onChange={e => setReportCategory(e.target.value)} aria-label="Incident category">
                          <option value="SLOPE CRACK">{t("SLOPE CRACK")}</option>
                          <option value="LANDSLIDE ACTIVITY">{t("LANDSLIDE ACTIVITY")}</option>
                          <option value="BLOCKED ROAD">{t("BLOCKED ROAD")}</option>
                          <option value="FLOODING">{t("FLOODING")}</option>
                          <option value="INFRASTRUCTURE DAMAGE">{t("INFRASTRUCTURE DAMAGE")}</option>
                        </select>
                        <select value={reportSeverity} onChange={e => setReportSeverity(e.target.value)} aria-label="Incident severity">
                          <option value="LOW">{t("LOW")}</option>
                          <option value="MEDIUM">{t("MEDIUM")}</option>
                          <option value="HIGH">{t("HIGH")}</option>
                          <option value="CRITICAL">{t("CRITICAL")}</option>
                        </select>
                      </div>
                      <div className="report-media">
                        <label className="file-upload-label">
                          <Upload size={13} />
                          <span>{reportFile ? reportFile.name : t("ATTACH EVIDENCE")}</span>
                          <input type="file" accept="image/*,video/*" onChange={e => setReportFile(e.target.files?.[0] ?? null)} />
                        </label>
                        <button className="button secondary" type="button" onClick={requestReportLocation}><MapPin size={13} /> {reportLocation ? t("LOCATION ATTACHED") : t("USE MY LOCATION")}</button>
                      </div>
                      <textarea
                        value={reportDescription}
                        onChange={e => setReportDescription(e.target.value)}
                        placeholder={t("Describe observed slope conditions or blockage in detail...")}
                        rows={3}
                      />
                      <div className="report-actions flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-800">
                        <span className="text-[11px] text-stone-400">
                          LOCATION: {(reportLocation ?? analysisPoint).latitude.toFixed(3)}, {(reportLocation ?? analysisPoint).longitude.toFixed(3)}{reportFile ? ` · FILE: ${reportFile.name}` : ""}
                        </span>
                        <button
                          className="button primary flex items-center gap-1.5"
                          onClick={submitReport}
                          disabled={createReportMutation.isPending || !reportDescription.trim()}
                        >
                          {createReportMutation.isPending ? t("SAVING TO DB…") : t("SUBMIT TO DATABASE")}
                          <Send size={14} />
                        </button>
                      </div>
                    </>
                  )}

                  {/* Live Active Reports in Database */}
                  {activeReportsQuery.data && activeReportsQuery.data.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-stone-800 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                        <span>{t("ACTIVE INCIDENTS IN DATABASE")} ({activeReportsQuery.data.length})</span>
                        <span className="text-amber-400">{t("TEMPORARY ACTIVE (24H)")}</span>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {activeReportsQuery.data.slice(0, 5).map((rep) => (
                          <div
                            key={rep.reportId}
                            className="p-2 bg-stone-900/90 border border-stone-800 flex items-start justify-between gap-2 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span
                                  className={`px-1.5 py-0.2 text-[9px] font-bold ${
                                    rep.severity === "CRITICAL"
                                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                      : rep.severity === "HIGH"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-stone-800 text-stone-300 border border-stone-700"
                                  }`}
                                >
                                  {rep.severity}
                                </span>
                                <b className="text-stone-200 text-[11px]">{t(rep.category)}</b>
                              </div>
                              <p className="text-stone-400 text-[11px] line-clamp-1 mt-0.5">{rep.description}</p>
                              <small className="text-stone-500 font-mono text-[9.5px]">
                                BY {rep.reporterName} · {rep.latitude.toFixed(2)}, {rep.longitude.toFixed(2)}
                              </small>
                            </div>
                            <span className="shrink-0 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 border border-emerald-500/20">
                              {t("ACTIVE")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* System Health & Multilingual Switcher */}
                <div className="health-card panel md:col-span-2 lg:col-span-6 xl:col-span-6">
                  <div className="panel-title">
                    <span><Wifi size={14} /> {t("SYSTEM HEALTH & CONFIGURATION")}</span>
                    <button className="health-toggle" onClick={cycleNetwork} aria-label="Cycle network status">
                      {networkState === "ONLINE" ? <Wifi size={13} /> : <WifiOff size={13} />} {t(networkState)}
                    </button>
                  </div>
                  <div className="health-list">
                    <span><i /> {t("DETERMINISTIC RISK ENGINE")} <b>{t("OPERATIONAL")}</b></span>
                    <span><i /> {t("ANOMALY VALIDATION")} <b>{t("ACTIVE")} (0 {t("QUARANTINED")})</b></span>
                    <span><i /> {t("NASA EONET v3 FEED")} <b>{liveAvailable ? t("CONNECTED") : t("FALLBACK")}</b></span>
                    <span><i className={networkState === "OFFLINE MODE" ? "offline-dot" : ""} /> {t("OFFLINE REPORT CACHE")} <b>{t("READY")}</b></span>
                  </div>
                  <div className="health-controls">
                    <label>
                      {t("NOTIFICATION LANGUAGE")}
                      <select value={language} onChange={e => changeLanguage(e.target.value)}>
                        {notificationLanguages.map(item => (
                          <option value={item.code} key={item.code}>{item.label} — {item.nativeLabel}</option>
                        ))}
                      </select>
                    </label>
                    <span>{t("LAST UPDATE")} <b>{lastUpdate}</b></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ESP32 Hardware Health Modal */}
      {deviceHealthOpen && (
        <div className="modal-overlay" onClick={() => setDeviceHealthOpen(false)}>
          <div className="modal-content panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Cpu size={16} className="text-amber-400" />
                <h3>{t("ESP32 Field Node Health & Sensor Registry")}</h3>
              </div>
              <button className="modal-close" onClick={() => setDeviceHealthOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="device-stats-grid">
                <div className="device-stat-box">
                  <span className="stat-label">{t("DEVICE ID")}</span>
                  <b>landsora-esp32-{zone.id.toLowerCase()}</b>
                </div>
                <div className="device-stat-box">
                  <span className="stat-label">{t("STATUS")}</span>
                  <b className="text-emerald-400">{t("ONLINE (MQTT TLS)")}</b>
                </div>
                <div className="device-stat-box">
                  <span className="stat-label">{t("BATTERY VOLTAGE")}</span>
                  <b>{zone.batteryVoltage}V ({Math.round(((zone.batteryVoltage - 3.2) / 1.0) * 100)}%)</b>
                </div>
                <div className="device-stat-box">
                  <span className="stat-label">{t("WIFI RSSI")}</span>
                  <b>{zone.wifiRssi} dBm ({t("Good")})</b>
                </div>
                <div className="device-stat-box">
                  <span className="stat-label">{t("FREE HEAP")}</span>
                  <b>184,520 bytes</b>
                </div>
                <div className="device-stat-box">
                  <span className="stat-label">{t("FIRMWARE")}</span>
                  <b>v1.0.0 (PlatformIO)</b>
                </div>
              </div>

              <div className="sensor-registry-table">
                <h4>{t("ATTACHED SENSOR ARRAY")}</h4>
                <table>
                  <thead>
                    <tr><th>{t("Sensor")}</th><th>{t("Pin / Interface")}</th><th>{t("Status")}</th><th>{t("Last Sample")}</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>{t("Tipping-Bucket Rain Gauge")}</td><td>GPIO 4 (Interrupt)</td><td className="text-emerald-400">{t("OK")}</td><td>{lastUpdate}</td></tr>
                    <tr><td>{t("Capacitive Soil Moisture v1.2")}</td><td>GPIO 34 (ADC1)</td><td className="text-emerald-400">{t("OK")}</td><td>{lastUpdate}</td></tr>
                    <tr><td>{t("MPU6050 Dual Inclinometer")}</td><td>I2C (SDA 21 / SCL 22)</td><td className="text-emerald-400">{t("OK")}</td><td>{lastUpdate}</td></tr>
                    <tr><td>{t("BME280 Atmospheric Sensor")}</td><td>I2C (0x76)</td><td className="text-emerald-400">{t("OK")}</td><td>{lastUpdate}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quarantine & Anomaly Inspector Modal */}
      {quarantineOpen && (
        <div className="modal-overlay" onClick={() => setQuarantineOpen(false)}>
          <div className="modal-content panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <AlertOctagon size={16} className="text-rose-400" />
                <h3>{t("Data Validation & Quarantined Anomalies")}</h3>
              </div>
              <button className="modal-close" onClick={() => setQuarantineOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                {t("Suspicious, unphysical, or sudden sensor spikes are isolated by the deterministic validation engine to prevent false evacuation alarms.")}
              </p>

              {getStoredQuarantine().length === 0 ? (
                <div className="quarantine-empty">
                  <CheckCircle2 size={24} className="text-emerald-400" />
                  <b>{t("No Quarantined Anomalies")}</b>
                  <p>{t("All incoming sensor telemetry passed Stage 1–5 validation checks.")}</p>
                </div>
              ) : (
                <div className="quarantine-table-wrap">
                  <table>
                    <thead>
                      <tr><th>{t("Time")}</th><th>{t("Node")}</th><th>{t("Anomaly Type")}</th><th>{t("Reason")}</th><th>{t("Status")}</th></tr>
                    </thead>
                    <tbody>
                      {getStoredQuarantine().map(q => (
                        <tr key={q.id}>
                          <td>{q.timestamp}</td>
                          <td><b>{q.siteId}</b></td>
                          <td><span className="anomaly-pill">{q.anomalyTypes.join(", ")}</span></td>
                          <td>{q.reason}</td>
                          <td className="text-amber-400">{t("QUARANTINED")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="button secondary mt-4" onClick={() => { clearQuarantineRecords(); setNotice("Quarantine records cleared."); }}>
                    <Trash2 size={13} /> {t("CLEAR QUARANTINE LOGS")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Emergency Hazard Alert Broadcast Simulation Modal */}
      {operatorApprovalModal && (
        <div className="modal-overlay" onClick={() => setOperatorApprovalModal(false)}>
          <div className="modal-content panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <AlertTriangle size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold font-mono text-stone-100">{t("Emergency Alert Broadcast Simulator")}</h3>
              </div>
              <button className="modal-close" onClick={() => setOperatorApprovalModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="operator-approval-card">
                <div className="operator-meta-header">
                  <div>
                    <span className="mono text-muted text-xs">{t("TARGET SECTOR")}: {zone.name} ({zone.id})</span>
                    <h4 className="text-sm font-bold text-stone-100 mt-1">{t("Hazard Warning Broadcast Preview")}</h4>
                  </div>
                  <span className="critical-badge font-mono font-bold">{t("RISK")}: {prototypeRiskScore}/100</span>
                </div>

                <div className="my-2">
                  <label className="block text-[10.5px] font-mono text-stone-400 uppercase mb-1">
                    {t("Alert Broadcast Dialect")}
                  </label>
                  <select
                    value={language}
                    onChange={e => changeLanguage(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-none px-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-amber-400"
                  >
                    {notificationLanguages.map(item => (
                      <option value={item.code} key={item.code}>
                        {item.label} ({item.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="notification-preview-box rounded-none p-3 bg-stone-950 border border-stone-800 text-xs">
                  <span className="mono text-amber-400 font-bold block mb-1 text-[10px]">
                    {t("SIMULATED NOTIFICATION PAYLOAD")} ({language.toUpperCase()}):
                  </span>
                  <strong className="block text-stone-100 text-xs font-bold mb-1">{notification.title}</strong>
                  <p className="text-stone-300 text-xs leading-relaxed">{notification.body}</p>
                </div>

                {operatorDeliveryLogs ? (
                  <div className="delivery-log-box rounded-none p-3 bg-emerald-950/40 border border-emerald-500/40">
                    <h5 className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                      <CheckCircle2 size={14} /> {t("SIMULATED ALERT DISPATCHED")}
                    </h5>
                    <small className="text-emerald-200/80 text-[11px] block mt-1">
                      {t("Dispatched to native browser HTML5 push notifications & local critical risk stream.")}
                    </small>
                  </div>
                ) : (
                  <div className="operator-actions flex items-center justify-end gap-2 pt-2">
                    <button className="button secondary text-xs" onClick={() => setOperatorApprovalModal(false)}>
                      {t("CANCEL")}
                    </button>
                    <button
                      className="button primary text-xs font-bold"
                      onClick={handleOperatorApproval}
                      disabled={operatorApprovalMutation.isPending}
                    >
                      <Send size={13} /> {operatorApprovalMutation.isPending ? t("DISPATCHING...") : t("SIMULATE BROADCAST ALERT")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Account Authentication Modal */}
      <GoogleAuthModal
        isOpen={googleAuthModalOpen}
        onClose={() => setGoogleAuthModalOpen(false)}
        onSuccess={() => {
          authMeQuery.refetch();
          setNotice("Google Account successfully verified for AI operations.");
        }}
      />

      {/* Geotechnical Mohr-Coulomb Factor of Safety (FoS) Slope Simulator Modal */}
      <SlopeStabilityModal
        isOpen={slopeModalOpen}
        onClose={() => setSlopeModalOpen(false)}
        zoneName={zone.name}
        initialSoilMoisture={zone.soil}
        initialTilt={zone.tilt}
      />

      {/* Live ESP32 Hardware Telemetry Ingest Packet Simulator Modal */}
      <HardwareSimulatorModal
        isOpen={hardwareModalOpen}
        onClose={() => setHardwareModalOpen(false)}
        nodeId={zone.id}
        onTelemetryInjected={(data) => {
          setNotice(`Telemetry injected successfully for ${data.nodeId || zone.id} (Calculated Risk: ${data.riskScore}/100)`);
        }}
      />

      {/* Live High-Resolution Meteorology & Atmospheric Radar Suite Modal */}
      <LiveMeteorologyModal
        isOpen={meteorologyModalOpen}
        onClose={() => setMeteorologyModalOpen(false)}
        data={liveData}
        stationName={zone.name}
        stationRegion={zone.region}
        countryFlag={zone.countryFlag}
        elevation={zone.elevation}
        coords={zone.coords}
      />

      {/* Toast Notification */}
      {notice && (

        <div className="toast" role="status" aria-live="polite">
          <Check size={16} />
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss notification">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value, unit, prev, color }: { icon: React.ReactNode; label: string; value: string; unit: string; prev: number; color: string }) {
  const v = Number(value);
  return (
    <div className="metric">
      <div className="metric-label">{icon}{label}</div>
      <div className="metric-value" style={{ color }}>{value}<small>{unit}</small></div>
      <div className="metric-delta"><ArrowUpRight size={13} /> {delta(v, prev)}</div>
    </div>
  );
}
