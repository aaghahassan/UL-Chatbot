import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import ChatPage from "@/pages/chat";
import CampusesPage from "@/pages/campuses";
import { LoginPage, SignupPage } from "@/pages/auth";
import AccountPage from "@/pages/account";
import { AuthProvider } from "@/lib/auth";
import { ChatAuthProvider } from "@/components/auth-dialog";
import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/c/:id" component={ChatPage} />
      <Route path="/campuses" component={CampusesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="ul-theme">
      <AuthProvider>
        <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ChatAuthProvider>
            <Router />
          </ChatAuthProvider>
        </WouterRouter>
        <Toaster />
        </TooltipProvider>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
