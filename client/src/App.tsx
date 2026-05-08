import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider } from "./contexts/AppContext";
import Home from "./pages/Home";
import CustomerChatPage from "./pages/CustomerChatPage";
import MerchantDashboardPage from "./pages/MerchantDashboardPage";
import MerchantDashboardV2Page from "./pages/MerchantDashboardV2Page";
import PluginDemoPage from "./pages/PluginDemoPage";
import PluginDemoV2Page from "./pages/PluginDemoV2Page";
import ReviewAgentSettingsPage from "./pages/ReviewAgentSettingsPage";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/customer-chat"} component={CustomerChatPage} />
      <Route path={"/merchant-dashboard"} component={MerchantDashboardPage} />
      <Route path={"/merchant-dashboard-v2"} component={MerchantDashboardV2Page} />
      <Route path={"/plugin-demo"} component={PluginDemoPage} />
      <Route path={"/plugin-demo-v2"} component={PluginDemoV2Page} />
      <Route path={"/review-agent-settings"} component={ReviewAgentSettingsPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
