import { Footer } from "./components/Footer";
import { Nav } from "./components/Nav";
import CheckoutPage from "./pages/CheckoutPage";
import CreatePage from "./pages/CreatePage";
import DesignsPage from "./pages/DesignsPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import OrdersPage from "./pages/OrdersPage";
import ProfilePage from "./pages/ProfilePage";
import StudioPage from "./pages/StudioPage";
import StudiosPage from "./pages/StudiosPage";
import { useRoute, type Route } from "./router";
import { StudioProvider } from "./studio/StudioContext";
import { ToastProvider } from "./studio/Toasts";

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
    case "designs":
      return param ? <NotFoundPage /> : <DesignsPage />;
    case "checkout":
      return param ? <NotFoundPage /> : <CheckoutPage query={query} />;
    case "orders":
      return param ? <OrderDetailPage id={param} query={query} /> : <OrdersPage />;
    case "profile":
      return param ? <NotFoundPage /> : <ProfilePage />;
    default:
      return <NotFoundPage />;
  }
}

export default function App() {
  const route = useRoute();

  return (
    <ToastProvider>
      <StudioProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Nav route={route} />
          {/* Keyed by path so each page remounts and replays its entrance animation. */}
          <main key={route.path}>{renderPage(route)}</main>
          <Footer />
        </div>
      </StudioProvider>
    </ToastProvider>
  );
}
