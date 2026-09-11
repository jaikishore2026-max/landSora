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
              <Route component={NotFound} />
            </Switch>
          </TooltipProvider>
        </CriticalRiskToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
