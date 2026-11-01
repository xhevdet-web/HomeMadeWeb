import type { ReactNode } from "react";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { Footer } from "./components/Footer";
import { Nav } from "./components/Nav";
import CheckoutPage from "./pages/CheckoutPage";
import ContactPage from "./pages/ContactPage";
import CreatePage from "./pages/CreatePage";
import DesignsPage from "./pages/DesignsPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import NotificationsPage from "./pages/NotificationsPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import OrdersPage from "./pages/OrdersPage";
import ProfilePage from "./pages/ProfilePage";
import StudioPage from "./pages/StudioPage";
import StudiosPage from "./pages/StudiosPage";
import { useRoute, type Route } from "./router";
import { StudioProvider } from "./studio/StudioContext";
import { ToastProvider } from "./studio/Toasts";
import { ThemeProvider } from "./theme";

/** Pages that need an account show the login modal when signed out. */
const protect = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>;

function renderPage({ segments, query }: Route) {
  const [section, param, extra, rest] = segments;
  if (rest || (extra && section !== "studios")) return <NotFoundPage />;

  switch (section) {
    case undefined:
      return <HomePage />;
    case "studios":
      return param ? <StudioPage slug={param} step={extra} query={query} /> : <StudiosPage />;
    case "create":
      return param ? <NotFoundPage /> : <CreatePage />;
    case "contact":
      return param ? <NotFoundPage /> : <ContactPage />;
    case "designs":
      return param ? <NotFoundPage /> : protect(<DesignsPage />);
    case "checkout":
      return param ? <NotFoundPage /> : protect(<CheckoutPage query={query} />);
    case "orders":
      return protect(param ? <OrderDetailPage id={param} query={query} /> : <OrdersPage query={query} />);
    case "profile":
      return param ? <NotFoundPage /> : protect(<ProfilePage />);
    case "notifications":
      return param ? <NotFoundPage /> : protect(<NotificationsPage />);
    default:
      return <NotFoundPage />;
  }
}

export default function App() {
  const route = useRoute();

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <StudioProvider>
            <div className="min-h-screen bg-background text-foreground">
              <Nav route={route} />
              {/* Keyed by path so each page remounts and replays its entrance animation. */}
              <main key={route.path}>{renderPage(route)}</main>
              <Footer />
            </div>
          </StudioProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
