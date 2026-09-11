import type { CSSProperties } from "react";

type SystemBoundary = {
  inputField: string;
  sourceType: "Live API" | "Simulated Telemetry";
  status: "PASS" | "WARNING";
};

type TestCase = {
  testCase: string;
  inputScenario: string;
  expectedOutput: string;
  resultStatus: "PASS" | "WARNING";
};

const systemBoundaries: SystemBoundary[] = [
  { inputField: "Weather", sourceType: "Live API", status: "PASS" },
  { inputField: "Soil Moisture", sourceType: "Simulated Telemetry", status: "WARNING" },
  { inputField: "Slope Tilt", sourceType: "Simulated Telemetry", status: "WARNING" },
  { inputField: "Satellite Imagery", sourceType: "Live API", status: "PASS" },
];

const testMatrix: TestCase[] = [
  {
    testCase: "Normal",
    inputScenario: "Stable weather, low soil moisture, and nominal slope tilt.",
    expectedOutput: "Continue monitoring; no advisory is generated.",
    resultStatus: "PASS",
  },
  {
    testCase: "Watch",
    inputScenario: "Rising rainfall, increasing soil moisture, and moderate slope movement.",
    expectedOutput: "Elevate to watch status and prepare an advisory for review.",
    resultStatus: "PASS",
  },
  {
    testCase: "Critical",
    inputScenario: "Rainfall, saturation, and slope tilt thresholds are exceeded.",
    expectedOutput: "Generate a critical evacuation recommendation for review.",
    resultStatus: "PASS",
  },
];

const styles: Record<string, CSSProperties> = {
  section: {
    width: "100%",
    maxWidth: "72rem",
    margin: "0 auto",
    padding: "2rem",
    color: "#f8fafc",
    backgroundColor: "#12141a",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    boxSizing: "border-box",
  },
  banner: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1.5rem",
    padding: "1rem 1.25rem",
    backgroundColor: "#2b2110",
    border: "1px solid #b7791f",
    borderRadius: "0.5rem",
  },
  bannerBadge: {
    flexShrink: 0,
    padding: "0.35rem 0.55rem",
    color: "#1c1917",
    backgroundColor: "#f59e0b",
    borderRadius: "999px",
    fontSize: "0.7rem",
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  bannerText: {
    margin: 0,
    color: "#fde68a",
    fontSize: "0.95rem",
    fontWeight: 700,
  },
  block: {
    marginTop: "1.5rem",
  },
  heading: {
    margin: "0 0 0.75rem",
    color: "#f8fafc",
    fontSize: "1.1rem",
    fontWeight: 750,
  },
  card: {
    overflowX: "auto",
    backgroundColor: "#181b23",
    border: "1px solid #303643",
    borderRadius: "0.6rem",
  },
  table: {
    width: "100%",
    minWidth: "38rem",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
  },
  headerCell: {
    padding: "0.8rem 1rem",
    color: "#aeb7c6",
    backgroundColor: "#20242d",
    borderBottom: "1px solid #3a4250",
    fontSize: "0.7rem",
    fontWeight: 800,
    letterSpacing: "0.07em",
    textAlign: "left",
    textTransform: "uppercase",
  },
  cell: {
    padding: "0.85rem 1rem",
    color: "#e2e8f0",
    borderBottom: "1px solid #2b303b",
    lineHeight: 1.5,
    verticalAlign: "top",
  },
  lastCell: {
    borderBottom: 0,
  },
  passBadge: {
    display: "inline-flex",
    padding: "0.25rem 0.55rem",
    color: "#bbf7d0",
    backgroundColor: "#14532d",
    border: "1px solid #22c55e",
    borderRadius: "999px",
    fontSize: "0.7rem",
    fontWeight: 800,
    letterSpacing: "0.06em",
  },
  warningBadge: {
    display: "inline-flex",
    padding: "0.25rem 0.55rem",
    color: "#fde68a",
    backgroundColor: "#451a03",
    border: "1px solid #f59e0b",
    borderRadius: "999px",
    fontSize: "0.7rem",
    fontWeight: 800,
    letterSpacing: "0.06em",
  },
};

function StatusBadge({ status }: { status: "PASS" | "WARNING" }) {
  return <span style={status === "PASS" ? styles.passBadge : styles.warningBadge}>{status}</span>;
}

export function ValidationSection() {
  return (
    <section style={styles.section} aria-labelledby="validation-section-title">
      <div style={styles.banner} role="note">
        <span style={styles.bannerBadge}>Disclaimer</span>
        <p id="validation-section-title" style={styles.bannerText}>
          Decision-Support Prototype — Not an Official Emergency Bulletin
        </p>
      </div>

      <div style={styles.block}>
        <h2 style={styles.heading}>Prototype Boundaries</h2>
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th scope="col" style={styles.headerCell}>
                  Input Field
                </th>
                <th scope="col" style={styles.headerCell}>
                  Source Type
                </th>
                <th scope="col" style={styles.headerCell}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {systemBoundaries.map((boundary, index) => (
                <tr key={boundary.inputField}>
                  <td style={index === systemBoundaries.length - 1 ? { ...styles.cell, ...styles.lastCell } : styles.cell}>
                    {boundary.inputField}
                  </td>
                  <td style={index === systemBoundaries.length - 1 ? { ...styles.cell, ...styles.lastCell } : styles.cell}>
                    {boundary.sourceType}
                  </td>
                  <td style={index === systemBoundaries.length - 1 ? { ...styles.cell, ...styles.lastCell } : styles.cell}>
                    <StatusBadge status={boundary.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.block}>
        <h2 style={styles.heading}>Deterministic Scenario Test Results</h2>
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th scope="col" style={styles.headerCell}>
                  Test Case
                </th>
                <th scope="col" style={styles.headerCell}>
                  Input Scenario
                </th>
                <th scope="col" style={styles.headerCell}>
                  Expected Output
                </th>
                <th scope="col" style={styles.headerCell}>
                  Result Status
                </th>
              </tr>
            </thead>
            <tbody>
              {testMatrix.map((test, index) => (
                <tr key={test.testCase}>
                  <td style={index === testMatrix.length - 1 ? { ...styles.cell, ...styles.lastCell } : styles.cell}>
                    <strong>{test.testCase}</strong>
                  </td>
                  <td style={index === testMatrix.length - 1 ? { ...styles.cell, ...styles.lastCell } : styles.cell}>
                    {test.inputScenario}
                  </td>
                  <td style={index === testMatrix.length - 1 ? { ...styles.cell, ...styles.lastCell } : styles.cell}>
                    {test.expectedOutput}
                  </td>
                  <td style={index === testMatrix.length - 1 ? { ...styles.cell, ...styles.lastCell } : styles.cell}>
                    <StatusBadge status={test.resultStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.block}>
        <h2 style={styles.heading}>Prototype Limitations</h2>
        <div style={{ ...styles.card, padding: "1rem 1.25rem" }}>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#cbd5e1", lineHeight: 1.7 }}>
            <li>Simulated telemetry is representative only and must not be treated as field-verified data.</li>
            <li>Live API outages, stale data, and coverage gaps can reduce confidence in the displayed risk.</li>
            <li>All advisories require review by qualified officers and local emergency authorities.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default ValidationSection;
