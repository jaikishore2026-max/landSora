/* Landsora Modern High-Precision Marketing & Value Landing Page: 30-40% Streamlined */
import { useState } from "react";
import { Link } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Compass,
  Cpu,
  FileCheck2,
  Gauge,
  Globe2,
  Layers3,
  Radio,
  Route,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  XCircle,
} from "lucide-react";
import ProductPreview from "@/components/landing/ProductPreview";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type LandingLang = "EN" | "HI" | "KN" | "TA" | "TE" | "ML";

const LANDING_LANG_CONFIG: { code: LandingLang; label: string; nativeLabel: string }[] = [
  { code: "EN", label: "English", nativeLabel: "English" },
  { code: "KN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { code: "TA", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "TE", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "ML", label: "Malayalam", nativeLabel: "മലയാളം" },
  { code: "HI", label: "Hindi", nativeLabel: "हिन्दी" },
];

const LANDING_I18N: Record<
  LandingLang,
  {
    eyebrow: string;
    title: string;
    titleEm: string;
    lead: string;
    ctaConsole: string;
    ctaHow: string;
    probKicker: string;
    probTitle1: string;
    probTitle2: string;
    probSub: string;
  }
> = {
  EN: {
    eyebrow: "EARLY WARNING FOR MOUNTAIN SLOPES · 32 ACTIVE MONITORING STATIONS",
    title: "Catch slope failure ",
    titleEm: "hours before the mud gives way",
    lead: "District rain alerts cover thousands of square kilometers, but slopes fail on specific hillsides. Landsora tracks soil saturation, slope tilt, and rainfall rate in real time — giving panchayats and emergency crews time to evacuate before roads and homes are buried.",
    ctaConsole: "OPEN LIVE CONSOLE",
    ctaHow: "SEE HOW IT WORKS",
    probKicker: "THE REALITY / 01",
    probTitle1: "District rain alerts warn everyone,",
    probTitle2: "but protect no single hillside.",
    probSub: "Monsoon bulletins cover entire districts. But a slope collapses because of pore water pressure, steep cuts, and heavy rain on one specific hill.",
  },
  KN: {
    eyebrow: "ಸ್ಥಳೀಯ ಭೂತಾಂತ್ರಿಕ ಮುನ್ನೆಚ್ಚರಿಕೆ ವ್ಯವಸ್ಥೆ · 32 ಜಾಗತಿಕ ನಿಲ್ದಾಣಗಳು",
    title: "ಭೂಕುಸಿತ ಸಂಭವಿಸುವ ಮುನ್ನವೇ ",
    titleEm: "ಗಂಟೆಗಳ ಮೊದಲೇ ನಿಖರ ಮುನ್ಸೂಚನೆ",
    lead: "ಜಿಲ್ಲಾ ಮಟ್ಟದ ಮಳೆ ಎಚ್ಚರಿಕೆಗಳು ತಡವಾಗಿ ತಲುಪುತ್ತವೆ. ಲ್ಯಾಂಡ್‌ಸೊರಾ ಮಣ್ಣಿನ ತೇವಾಂಶ, ಇಳಿಜಾರಿನ ಕೋನ ಮತ್ತು ನೈಜ ಮಳೆ ದಾಖಲೆಗಳನ್ನು ನಿರಂತರವಾಗಿ ಪರಿಶೀಲಿಸಿ ಕನ್ನಡದಲ್ಲೇ ತ್ವರಿತ ಸ್ಥಳಾಂತರ ಎಚ್ಚರಿಕೆ ನೀಡುತ್ತದೆ.",
    ctaConsole: "ಲೈವ್ ಕನ್ಸೋಲ್ ತೆರೆಯಿರಿ",
    ctaHow: "ಕಾರ್ಯವೈಖರಿ",
    probKicker: "ಸವಾಲು / 01",
    probTitle1: "ಜಿಲ್ಲಾ ವರದಿಗಳು ಎಲ್ಲರಿಗೂ ತಿಳಿಸುತ್ತವೆ,",
    probTitle2: "ಆದರೆ ನಿರ್ದಿಷ್ಟ ಬೆಟ್ಟವನ್ನು ರಕ್ಷಿಸುವುದಿಲ್ಲ.",
    probSub: "ಮಳೆ ವರದಿಗಳು ಸಾವಿರಾರು ಚದರ ಕಿ.ಮೀ ವ್ಯಾಪಿಸುತ್ತವೆ. ಆದರೆ ನಿರ್ದಿಷ್ಟ ಇಳಿಜಾರಿನ ಮಣ್ಣಿನ ಒತ್ತಡ ಮತ್ತು ನೀರಿನ ಸಾಂದ್ರತೆಯಿಂದ ಕುಸಿತ ಉಂಟಾಗುತ್ತದೆ.",
  },
  TA: {
    eyebrow: "மண் சரிவு முன்னெச்சரிக்கை அமைப்பு · 32 உலகளாவிய நிலையங்கள்",
    title: "மண் சரிவு ஏற்படுவதற்கு முன்பே ",
    titleEm: "பல மணிநேரங்களுக்கு முன் கண்டறியவும்",
    lead: "பொதுவான மாவட்ட எச்சரிக்கைகள் தாமதமாக வருகின்றன. லேண்ட்சோரா மண்ணின் ஈரப்பதம் மற்றும் சாய்வு கோணத்தை தொடர்ந்து கண்காணித்து தமிழில் நேரடி பாதுகாப்பு வழிகாட்டுதலை வழங்குகிறது.",
    ctaConsole: "நேரடி பணியகம் திறக்கவும்",
    ctaHow: "எவ்வாறு செயல்படுகிறது",
    probKicker: "சவால் / 01",
    probTitle1: "மாவட்ட வானிலை எச்சரிக்கைகள் அனைவருக்கும் வரும்,",
    probTitle2: "ஆனால் குறிப்பிட்ட மலையை பாதுகாக்காது.",
    probSub: "மழை எச்சரிக்கைகள் பரந்த பரப்பளவை உள்ளடக்கியது. ஆனால் குறிப்பிட்ட மலைச்சரிவுகளில் ஏற்படும் மண் அழுத்தமே சரிவுக்கு காரணமாகிறது.",
  },
  TE: {
    eyebrow: "హైపర్‌లోకల్ కొండచరియల ముందస్తు హెచ్చరిక · 32 గ్లోబల్ స్టేషన్లు",
    title: "కొండచరియలు విరిగిపడే ప్రమాదాన్ని ",
    titleEm: "గంటల ముందే గుర్తించండి",
    lead: "సాధారణ జిల్లా వర్ష సమాచారం ఆలస్యంగా వస్తుంది. ల్యాండ్‌సోరా నేల తేమ, వాలు కోణం మరియు వర్షపాతాన్ని నిరంతరం పర్యవేక్షిస్తూ తెలుగులో రక్షణ హెచ్చరికలను అందిస్తుంది.",
    ctaConsole: "లైవ్ కన్సోల్ తెరవండి",
    ctaHow: "పనితీరు ఎలా ఉంటుంది",
    probKicker: "సవాలు / 01",
    probTitle1: "జిల్లా వర్ష హెచ్చరికలు అందరికీ ఉంటాయి,",
    probTitle2: "కానీ ఏ నిర్దిష్ట కొండనూ కాపాడలేవు.",
    probSub: "వర్ష హెచ్చరికలు వేల చదరపు కి.మీ వ్యాపిస్తాయి. కానీ నిర్దిష్ట కొండచరియలో నీటి ఒత్తిడి కారణంగానే విరిగిపడటం జరుగుతుంది.",
  },
  ML: {
    eyebrow: "ഹൈപ്പർലോക്കൽ മണ്ണിടിച്ചിൽ മുന്നറിയിപ്പ് സംവിധാനം · 32 ആഗോള സ്റ്റേഷനുകൾ",
    title: "മണ്ണിടിച്ചിൽ ഉണ്ടാകുന്നതിന് ",
    titleEm: "മണിക്കൂറുകൾക്ക് മുമ്പ് തിരിച്ചറിയാം",
    lead: "ജില്ലാതല മഴ മുന്നറിയിപ്പുകൾ പലപ്പോഴും വൈകിയാണ് ലഭിക്കുന്നത്. ലാൻഡ്‌സോറ മണ്ണിന്റെ ഈർപ്പവും ചരിവും തത്സമയം നിരീക്ഷിച്ച് മലയാളത്തിൽ വ്യക്തമായ ജാഗ്രതാ നിർദ്ദേശങ്ങൾ നൽകുന്നു.",
    ctaConsole: "ലൈവ് കൺസോൾ തുറക്കുക",
    ctaHow: "പ്രവർത്തന രീതി",
    probKicker: "വെല്ലുവിളി / 01",
    probTitle1: "ജില്ലാ മുന്നറിയിപ്പുകൾ എല്ലാവരിലേക്കും എത്തുന്നു,",
    probTitle2: "പക്ഷേ നിർദ്ദിഷ്ട ചരിവുകളെ സംരക്ഷിക്കുന്നില്ല.",
    probSub: "മഴ മുന്നറിയിപ്പുകൾ വിസ്തൃതമായ പ്രദേശങ്ങൾക്കാണ്. എന്നാൽ പാറയിടുക്കുകളിലെ ജലമർദ്ദമാണ് മണ്ണിടിച്ചിലിന് കാരണം.",
  },
  HI: {
    eyebrow: "अति-स्थानीय भूस्खलन पूर्व चेतावनी प्रणाली · 32 वैश्विक निगरानी स्टेशन",
    title: "भूस्खलन के खतरे का ",
    titleEm: "घंटों पहले सटीक पूर्वानुमान",
    lead: "सामान्य जिला स्तरीय मौसम चेतावनियां देर से पहुंचती हैं। लैंड्सोरा मिट्टी की नमी, ढलान के झुकाव और वर्षा टेलीमेट्री की निरंतर निगरानी करके हिंदी में स्पष्ट निकासी सलाह जारी करता है।",
    ctaConsole: "लाइव फील्ड कंसोल खोलें",
    ctaHow: "यह कैसे कार्य करता है",
    probKicker: "चुनौती / 01",
    probTitle1: "जिला बुलेटिन सभी को सचेत करते हैं,",
    probTitle2: "लेकिन किसी विशिष्ट पहाड़ी को नहीं बचाते।",
    probSub: "मानसून की सामान्य चेतावनी हजारों वर्ग किमी को कवर करती है, जबकि ढलान विफलता विशिष्ट भूवैज्ञानिक दबाव के कारण होती है।",
  },
};

export default function LandingPage() {
  const [selectedLandingLang, setSelectedLandingLang] = useState<LandingLang>("EN");
  const t = LANDING_I18N[selectedLandingLang];

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="marketing-landing-page">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="marketing-navbar">
        <div className="marketing-nav-brand">
          <img src="/assets/lews-logo.png" alt="Landsora Contour Logo" className="marketing-nav-logo" />
          <div className="marketing-brand-text">
            <span className="marketing-brand-name">Landsora</span>
            <span className="marketing-brand-sub">LANDSLIDE EARLY WARNING</span>
          </div>
        </div>

        <nav className="marketing-nav-links" aria-label="Main Navigation">
          <button onClick={() => scrollTo("problem")} className="nav-link-btn">Problem</button>
          <button onClick={() => scrollTo("solution")} className="nav-link-btn">Solution</button>
          <button onClick={() => scrollTo("ground-truth")} className="nav-link-btn">Ground Truth</button>
          <button onClick={() => scrollTo("features")} className="nav-link-btn">Capabilities</button>
          <button onClick={() => scrollTo("how-it-works")} className="nav-link-btn">Architecture</button>
          <button onClick={() => scrollTo("faq")} className="nav-link-btn">FAQ</button>
        </nav>

        <div className="marketing-nav-actions">
          {/* Quick Indic Language Ribbon */}
          <div className="landing-lang-strip">
            {LANDING_LANG_CONFIG.map((l) => (
              <button
                key={l.code}
                type="button"
                className={`landing-lang-btn ${selectedLandingLang === l.code ? "active" : ""}`}
                onClick={() => setSelectedLandingLang(l.code)}
                title={`Switch preview to ${l.label} (${l.nativeLabel})`}
              >
                {l.code}
              </button>
            ))}
          </div>

          <Link href="/ai-chatbot" className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-amber-300 hover:text-amber-200 font-semibold border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all">
            <Sparkles size={13} className="text-amber-400" />
            <span>AI Companion</span>
          </Link>
          <Link href="/community-ground-intelligence" className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-orange-300 hover:text-orange-200 font-semibold border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-all">
            <Compass size={13} className="text-orange-400" />
            <span>Report Ground Condition</span>
          </Link>

          <Link href="/login" className="nav-auth-link">
            Sign In
          </Link>
          <Link href="/dashboard" className="nav-launch-btn">
            <span>Launch Console</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main>
        {/* 2. HERO SECTION */}
        <section className="marketing-hero">
          <div className="hero-background-art" />
          <div className="hero-content-wrapper">
            <div className="hero-hud-strip">
              <span className="hud-live-tag">LIVE TELEMETRY STREAM</span>
              <span>/</span>
              <span>STATION KDG-03</span>
              <span>/</span>
              <span>13° 18′ 55″ N, 75° 48′ 12″ E</span>
              <span>/</span>
              <span>WESTERN GHATS</span>
            </div>

            <div className="hero-eyebrow">
              <span className="hero-rule" />
              <span>{t.eyebrow}</span>
            </div>

            <h1 className="hero-main-title">
              {t.title}<em>{t.titleEm}</em> — without blind forecasts.
            </h1>

            <p className="hero-lead-text">
              {t.lead}
            </p>

            <div className="hero-cta-group">
              <Link href="/dashboard" className="hero-primary-btn">
                <span>{t.ctaConsole}</span>
                <ChevronRight size={16} />
              </Link>
              <button onClick={() => scrollTo("how-it-works")} className="hero-secondary-btn">
                <span>{t.ctaHow}</span>
                <span className="down-arrow">↓</span>
              </button>
            </div>

            {/* Controlled Product Preview */}
            <div className="hero-preview-container">
              <ProductPreview />
            </div>

            {/* Trust Indicators Strip */}
            <div className="hero-trust-strip">
              <div className="trust-item">
                <Radio size={14} className="trust-icon" />
                <span>Live NASA EONET Feeds</span>
              </div>
              <div className="trust-separator">/</div>
              <div className="trust-item">
                <Cpu size={14} className="trust-icon" />
                <span>4-Factor Risk Engine</span>
              </div>
              <div className="trust-separator">/</div>
              <div className="trust-item">
                <Globe2 size={14} className="trust-icon" />
                <span>28+ Real-Time Languages</span>
              </div>
              <div className="trust-separator">/</div>
              <div className="trust-item">
                <FileCheck2 size={14} className="trust-icon" />
                <span>Open Source (MIT)</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. SOCIAL PROOF & METRICS */}
        <section className="marketing-metrics-strip" aria-label="Key telemetry benchmarks">
          <div className="metric-col">
            <strong>32</strong>
            <span>GLOBAL & MOUNTAIN<br />STATIONS</span>
            <small>Western Ghats, Himalayas, Alps & Andes</small>
          </div>
          <div className="metric-col">
            <strong>3–6 HRS</strong>
            <span>PROACTIVE WARNING<br />LEAD TIME</span>
            <small>Before catastrophic mass movement</small>
          </div>
          <div className="metric-col">
            <strong>28+</strong>
            <span>GLOBAL & INDIC<br />LANGUAGES</span>
            <small>Kannada, Tamil, Telugu, Malayalam, Hindi, English, etc.</small>
          </div>
          <div className="metric-col highlight-col">
            <strong>&lt; 2.5s</strong>
            <span>TELEMETRY STREAM<br />UPDATE LATENCY</span>
            <small>Continuous pore-moisture and tilt ingestion</small>
          </div>
        </section>

        {/* 4. THE PROBLEM STATEMENT */}
        <section id="problem" className="marketing-section problem-dark-section">
          <div className="section-container">
            <div className="section-kicker">
              <span className="kicker-rule" />
              <span>{t.probKicker}</span>
            </div>

            <h2 className="section-title">
              {t.probTitle1}<br />
              <em>{t.probTitle2}</em>
            </h2>

            <p className="section-subtitle">
              {t.probSub}
            </p>

            <div className="problem-cards-grid">
              <div className="problem-card">
                <div className="problem-card-icon red-tint"><AlertTriangle size={20} /></div>
                <h3>Warning Fatigue</h3>
                <p>
                  When sirens sound across an entire district for generic monsoon rain, people tune them out because 99% of hills hold. Then the one saturated slope collapses without warning.
                </p>
                <span className="problem-card-cost">RESULT: Nobody evacuates until mud is already sliding</span>
              </div>

              <div className="problem-card">
                <div className="problem-card-icon amber-tint"><ClockHistoryIcon /></div>
                <h3>Alerts That Arrive Too Late</h3>
                <p>
                  Official disaster bulletins are usually published after debris has already blocked the road. By then, buses are stranded and rescue teams cannot cross the pass.
                </p>
                <span className="problem-card-cost">RESULT: Recovery operations instead of early evacuations</span>
              </div>

              <div className="problem-card">
                <div className="problem-card-icon teal-tint"><Globe2 size={20} /></div>
                <h3>Language Barriers on Hill Slopes</h3>
                <p>
                  Technical warnings in formal English or administrative text rarely help village councils, tractor operators, or local transport drivers who need plain Kannada, Tamil, or Malayalam.
                </p>
                <span className="problem-card-cost">RESULT: Evacuation orders sit unread in district offices</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. SHOW THE REAL COST (CONSEQUENCE & COMPARISON) */}
        <section className="marketing-section cost-section">
          <div className="section-container">
            <div className="section-kicker">
              <span className="kicker-rule" />
              <span>WHAT 3 HOURS CAN SAVE / 02</span>
            </div>

            <h2 className="section-title">
              What a 3-hour lead time actually changes.
            </h2>

            <div className="comparison-table-wrapper">
              <div className="comparison-col traditional-col">
                <div className="comparison-col-header">
                  <XCircle size={18} className="text-red-400" />
                  <span>TRADITIONAL DISTRICT FORECASTS</span>
                </div>
                <div className="comparison-steps">
                  <div className="step-item">
                    <span className="step-num">01</span>
                    <div>
                      <b>Broad Rain Advisory</b>
                      <p>Covers 3,000 km² without any real-time soil or tilt readings.</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num">02</span>
                    <div>
                      <b>Uncertainty</b>
                      <p>Control rooms cannot tell whether Charmadi, Shiradi, or Wayanad is about to fail.</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num">03</span>
                    <div>
                      <b>Sudden Night Collapse</b>
                      <p>Soil liquefies at 2 AM. Heavy debris cuts off the mountain artery.</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num">04</span>
                    <div>
                      <b>Dangerous Recovery</b>
                      <p>Emergency crews search under active rockfall in the dark.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="comparison-col lews-col">
                <div className="comparison-col-header">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  <span>WITH LANDSORA</span>
                </div>
                <div className="comparison-steps">
                  <div className="step-item">
                    <span className="step-num">01</span>
                    <div>
                      <b>Real-Time Soil Saturation & Tilt</b>
                      <p>Field sensors measure pore water pressure and slope angle changes every 2 seconds.</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num">02</span>
                    <div>
                      <b>Clear WATCH Alert</b>
                      <p>Risk climbs toward 40/100 as the soil nears its plastic limit. Drivers are visible.</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num">03</span>
                    <div>
                      <b>Local Language Notices & Detours</b>
                      <p>Phone alerts push in Kannada, Tamil, or Malayalam; police divert uphill traffic.</p>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num">04</span>
                    <div>
                      <b>Evacuate Before Collapse</b>
                      <p>Families and vehicles move to safe ground before the hillside gives way.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. INTRODUCE THE SOLUTION & VALUE PROPOSITION */}
        <section id="solution" className="marketing-section solution-overview-section">
          <div className="section-container">
            <div className="section-kicker">
              <span className="kicker-rule" />
              <span>THE PLATFORM / 03</span>
            </div>

            <h2 className="section-title">
              How the platform works,<br />
              <em>without black-box math.</em>
            </h2>

            <div className="solution-pillars-grid">
              <div className="pillar-item">
                <div className="pillar-num">01</div>
                <h3>Auditable Risk Equations</h3>
                <p>
                  No mystery AI predicting doom without reasons. The score comes from weighted rainfall, real-time soil saturation, and tiltmeter drift calibrated to local bedrock.
                </p>
              </div>

              <div className="pillar-item">
                <div className="pillar-num">02</div>
                <h3>Local Languages First</h3>
                <p>
                  Warnings translate immediately into Kannada, Tamil, Telugu, Malayalam, and Hindi so village councils get plain, actionable notices on their phones.
                </p>
              </div>

              <div className="pillar-item">
                <div className="pillar-num">03</div>
                <h3>Built for Power & Network Outages</h3>
                <p>
                  When storms take down mobile towers, observers log tension cracks, photos, and GPS tags locally. Data syncs automatically the moment signal returns.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. GEOTECHNICAL GROUND TRUTH & PHYSICAL SLOPE SENSING */}
        <section id="ground-truth" className="marketing-section geotech-section">
          <div className="section-container">
            <div className="section-kicker">
              <span className="kicker-rule" />
              <span>GROUND TRUTH // 04</span>
            </div>

            <div className="geotech-header-flex">
              <div>
                <h2 className="section-title">
                  Physical slope telemetry,<br />
                  <em>not remote guesswork.</em>
                </h2>
                <p className="section-subtitle">
                  Satellite radar and regional rain models tell you an entire mountain range is wet. Landsora connects directly to physical borehole MEMS tilt sensors, pore-pressure piezometers, and soil capacitance probes anchored deep into bedrock.
                </p>
              </div>
              <div className="geotech-badge-box">
                <span className="mono">STATION HARNESS // MPU6050</span>
                <strong>WESTERN GHATS CORRIDOR</strong>
                <small>Continuous 10Hz MEMS Inclinometer & Moisture Array</small>
              </div>
            </div>

            <div className="geotech-showcase-grid">
              <div className="geotech-image-frame">
                <img
                  src="/assets/lews-slope-detail.png"
                  alt="Monitored hillside cut slope showing in-situ borehole sensor casing and stratified soil layers"
                  className="geotech-main-image"
                />
                <div className="geotech-image-overlay">
                  <div className="image-hud-tag tag-probe">
                    <span className="hud-indicator" />
                    <div className="hud-content">
                      <b>BOREHOLE CASING</b>
                      <span>Depth: 1.8m · In-situ Tilt & Moisture</span>
                    </div>
                  </div>
                  <div className="image-hud-tag tag-shear">
                    <span className="hud-indicator" />
                    <div className="hud-content">
                      <b>SLIP PLANE STRATIGRAPHY</b>
                      <span>Residual Basalt Saprolite / Clay Horizon</span>
                    </div>
                  </div>
                  <div className="image-caption-strip">
                    <span>FIELD PROBE // KDG-03 WESTERN GHATS</span>
                    <span>SOIL MOISTURE CAPACITANCE + MEMS TILT</span>
                  </div>
                </div>
              </div>

              <div className="geotech-details-col">
                <div className="geotech-spec-card">
                  <div className="spec-head">
                    <Layers3 size={18} className="text-amber-400" />
                    <h4>Slip Plane Mechanics</h4>
                  </div>
                  <p>
                    Rainfall accumulates in upper colluvial soil until pore-water pressure exceeds shear resistance along the impermeable saprolite boundary. Landsora detects moisture saturation at depth hours before surface cracks manifest.
                  </p>
                  <div className="spec-stat-row">
                    <div>
                      <small>PLASTICITY LIMIT</small>
                      <b>78% Saturation</b>
                    </div>
                    <div>
                      <small>TILT THRESHOLD</small>
                      <b>&gt; 0.08° / hr</b>
                    </div>
                  </div>
                </div>

                <div className="geotech-spec-card">
                  <div className="spec-head">
                    <Radio size={18} className="text-teal-400" />
                    <h4>Local ESP32 & LoRa Field Transmission</h4>
                  </div>
                  <p>
                    Field nodes don't rely on fragile commercial cell towers that drop during storms. Ingested via direct low-power telemetry, buffered locally in persistent NVRAM, and streamed with sub-2.5s latency to emergency operations centers.
                  </p>
                  <div className="spec-stat-row">
                    <div>
                      <small>INGESTION PROTOCOL</small>
                      <b>HTTP / MQTT Telemetry</b>
                    </div>
                    <div>
                      <small>OFFLINE BUFFER</small>
                      <b>72hr On-Chip Flash</b>
                    </div>
                  </div>
                </div>

                <div className="geotech-spec-card">
                  <div className="spec-head">
                    <ShieldCheck size={18} className="text-emerald-400" />
                    <h4>Calibrated to Regional Bedrock</h4>
                  </div>
                  <p>
                    Every station profile is calibrated against local geotechnical surveys—accounting for Deccan Trap basalts in Maharashtra, charnockites in Kerala, and metamorphics in Sikkim.
                  </p>
                  <div className="spec-stat-row">
                    <div>
                      <small>CALIBRATED STATIONS</small>
                      <b>32 Global Sites</b>
                    </div>
                    <div>
                      <small>DECISION ENGINE</small>
                      <b>Deterministic Rule-Set</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. FEATURES */}
        <section id="features" className="marketing-section features-section">
          <div className="section-container">
            <div className="section-kicker">
              <span className="kicker-rule" />
              <span>CAPABILITIES / 05</span>
            </div>

            <h2 className="section-title">
              What the console tracks.
            </h2>

            <div className="feature-showcase-grid">
              <div className="feature-card">
                <div className="feature-card-header">
                  <Gauge size={22} className="text-amber-400" />
                  <span className="feature-tag">STABILITY ENGINE</span>
                </div>
                <h3>Multi-Sensor Risk Matrix</h3>
                <p>
                  Combines rainfall intensity (mm/hr), tilt rate (°/hr), and capacitive soil moisture into an accountable 0–100 score across STABLE, WATCH, and CRITICAL states.
                </p>
              </div>

              <div className="feature-card gis-card">
                <div className="feature-card-header">
                  <Compass size={22} className="text-emerald-400" />
                  <span className="feature-tag">CONTOUR GIS & TERRAIN</span>
                </div>
                <h3>Satellite GIS & Active NASA Tracking</h3>
                <p>
                  Esri satellite imagery with contour lines, real-time station halos, and active NASA EONET weather and seismic feeds.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-card-header">
                  <Route size={22} className="text-cyan-400" />
                  <span className="feature-tag">ROAD NETWORK</span>
                </div>
                <h3>Mountain Pass & Diversion Alerts</h3>
                <p>
                  Monitors vulnerable highways including Charmadi Ghat, Wayanad Pass, and NH 10, calculating alternate valley routes before roads close.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-card-header">
                  <ShieldCheck size={22} className="text-amber-400" />
                  <span className="feature-tag">EDGE TELEMETRY</span>
                </div>
                <h3>Physical Ingest & Hardware Security</h3>
                <p>
                  Authenticated ESP32 telemetry ingestion endpoint with token-verified headers, physical sanity bounds checks, and automatic tamper rejection.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 9. HOW IT WORKS */}
        <section id="how-it-works" className="marketing-section how-it-works-section">
          <div className="section-container">
            <div className="section-kicker">
              <span className="kicker-rule" />
              <span>WORKFLOW // 06</span>
            </div>

            <h2 className="section-title">
              From slope movement to village safety.
            </h2>

            <div className="workflow-steps-grid">
              <div className="workflow-card">
                <div className="workflow-num">01</div>
                <div className="workflow-icon"><Radio size={20} /></div>
                <h3>MEASURE</h3>
                <p>Solar field nodes record rain, moisture depth, and MEMS tilt every few seconds.</p>
              </div>

              <div className="workflow-arrow-divider">→</div>

              <div className="workflow-card">
                <div className="workflow-num">02</div>
                <div className="workflow-icon"><Cpu size={20} /></div>
                <h3>EVALUATE</h3>
                <p>The risk engine calculates stability against site bedrock and historical soil limits.</p>
              </div>

              <div className="workflow-arrow-divider">→</div>

              <div className="workflow-card">
                <div className="workflow-num">03</div>
                <div className="workflow-icon"><Sparkles size={20} /></div>
                <h3>TRANSLATE</h3>
                <p>Bulletins convert into regional languages and dispatch directly to local phones.</p>
              </div>

              <div className="workflow-arrow-divider">→</div>

              <div className="workflow-card">
                <div className="workflow-num">04</div>
                <div className="workflow-icon"><ShieldAlert size={20} /></div>
                <h3>EVACUATE</h3>
                <p>Authorities close dangerous passes and guide families to safety before collapse.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 10. FAQ SECTION */}
        <section id="faq" className="marketing-section faq-section">
          <div className="section-container">
            <div className="section-kicker">
              <span className="kicker-rule" />
              <span>FAQ // 07</span>
            </div>

            <h2 className="section-title">
              Common questions.
            </h2>

            <div className="faq-layout-grid">
              <Accordion type="single" collapsible className="marketing-faq-accordion">
                <AccordionItem value="what-is-lews" className="faq-acc-item">
                  <AccordionTrigger>What is Landsora and who uses it?</AccordionTrigger>
                  <AccordionContent>
                    Landsora is a landslide early warning console built for disaster management teams (NDMA/SDMA), district emergency rooms, village panchayats, and field engineers monitoring vulnerable slopes.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="how-is-risk-calculated" className="faq-acc-item">
                  <AccordionTrigger>How is the 0–100 risk score calculated?</AccordionTrigger>
                  <AccordionContent>
                    The score tracks three physical factors: 40% rainfall rate, 35% soil moisture saturation, and 25% tilt rate, calibrated against each station's bedrock type. Under 40 is safe, 40–70 is a watch state, and above 70 triggers immediate evacuation.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="how-does-offline-work" className="faq-acc-item">
                  <AccordionTrigger>How does offline citizen reporting work?</AccordionTrigger>
                  <AccordionContent>
                    Your browser saves crack observations, photos, and GPS coordinates locally. Even if you lose cell signal in the mountains, your report stays safe and uploads automatically when you're back online.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="hardware-connection" className="faq-acc-item">
                  <AccordionTrigger>Can I connect real physical hardware?</AccordionTrigger>
                  <AccordionContent>
                    Yes. The repository includes ESP32 Arduino firmware and a standard ingestion endpoint (<code>POST /api/telemetry/ingest</code>) for MPU6050 tilt sensors, tipping bucket rain gauges, and capacitive moisture probes.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="faq-sidebar-note">
                <div className="sidebar-note-header">
                  <Shield size={16} className="text-amber-400" />
                  <span>TRANSPARENCY GUARANTEE</span>
                </div>
                <p>
                  Every measurement, formula, and sensor reading in Landsora is mathematically auditable. The system never conceals data limits or hallucinates safety margins.
                </p>
                <Link href="/dashboard" className="sidebar-explore-btn">
                  <span>Open Field Console</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 11. FINAL CONVERSION CTA */}
        <section className="marketing-section final-cta-section">
          <div className="section-container">
            <div className="final-cta-card">
              <div className="final-cta-copy">
                <div className="section-kicker">
                  <span className="kicker-rule" />
                  <span>FIELD CONSOLE // 08</span>
                </div>
                <h2>
                  Give mountain communities hours of notice,<br />
                  <em>not minutes.</em>
                </h2>
                <p>
                  Open the live console to monitor 32 active mountain stations, simulate monsoon storms, or connect your own field sensors.
                </p>
                <div className="final-cta-actions">
                  <Link href="/dashboard" className="cta-btn-primary">
                    <span>OPEN LIVE FIELD CONSOLE</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link href="/signup" className="cta-btn-secondary">
                    <span>CREATE OBSERVER ACCOUNT</span>
                  </Link>
                </div>
              </div>
              <div className="final-cta-badge">
                <img src="/assets/lews-logo.png" alt="Landsora contour mark" />
                <span>SYSTEM ONLINE · 32 STATIONS</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 11. FOOTER */}
      <footer className="marketing-footer">
        <div className="footer-top">
          <div className="footer-brand-col">
            <div className="footer-brand-header">
              <img src="/assets/lews-logo.png" alt="Landsora logo" />
              <div>
                <strong>Landsora</strong>
                <span>LANDSLIDE EARLY WARNING SYSTEM</span>
              </div>
            </div>
            <p>
              Hyperlocal geological monitoring and disaster decision support console for vulnerable mountain corridors and hillside communities.
            </p>
          </div>

          <div className="footer-nav-col">
            <h4>CONSOLE</h4>
            <Link href="/dashboard">Field Console</Link>
            <Link href="/ai-chatbot">AI Companion</Link>
            <button onClick={() => scrollTo("features")}>Capabilities</button>
            <button onClick={() => scrollTo("faq")}>FAQ</button>
          </div>

          <div className="footer-nav-col">
            <h4>INTEGRATIONS</h4>
            <a href="https://eonet.gsfc.nasa.gov/docs/v3" target="_blank" rel="noreferrer">
              NASA EONET v3
            </a>
            <Link href="/settings">Hardware Telemetry API</Link>
            <Link href="/login">Officer Sign In</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <span>MIT LICENSE · COPYRIGHT © 2026 LANDSORA LEWS</span>
          <span className="footer-disclaimer-tag">DECISION SUPPORT CONSOLE — NOT AN OFFICIAL BULLETIN</span>
        </div>
      </footer>
    </div>
  );
}

function ClockHistoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
