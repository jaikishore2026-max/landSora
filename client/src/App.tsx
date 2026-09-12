/* LEWS Full-Stack Decision Support System: Multi-Route Application Router */
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CriticalRiskToastProvider } from "./contexts/CriticalRiskToastContext";
import { CriticalRiskToastContainer } from "./components/CriticalRiskToastContainer";

import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import AiChatbotPage from "./pages/AiChatbotPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import CommunityGroundIntelligencePage from "./pages/CommunityGroundIntelligencePage";
import WeatherTelemetryModule from "./components/WeatherTelemetryModule";
import DegradedRainfallDashboard from "./components/DegradedRainfallDashboard";

function WeatherFallbackRoute() {
  return <WeatherTelemetryModule />;
}

function DegradedRainfallRoute() {
  return (
    <main className="min-h-screen bg-[#0B0F12] p-4 sm:p-8">
      <DegradedRainfallDashboard />
    </main>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <CriticalRiskToastProvider>
          <TooltipProvider>
            <Toaster />
            <CriticalRiskToastContainer />
            <Switch>
              <Route path="/" component={LandingPage} />
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/ai-chatbot" component={AiChatbotPage} />
              <Route path="/ai-assistant" component={AiChatbotPage} />
              <Route path="/login" component={LoginPage} />
              <Route path="/signup" component={SignupPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/community-ground-intelligence" component={CommunityGroundIntelligencePage} />
              <Route path="/community-reports" component={CommunityGroundIntelligencePage} />
              <Route path="/report-review" component={CommunityGroundIntelligencePage} />
              <Route path="/weather-fallback" component={WeatherFallbackRoute} />
              <Route path="/degraded-rainfall" component={DegradedRainfallRoute} />
              <Route component={NotFound} />
            </Switch>
          </TooltipProvider>
        </CriticalRiskToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
