import { Switch, Route, Router as WouterRouter } from "wouter";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Home } from "@/pages/Home";
import { Program } from "@/pages/Program";
import { Speakers } from "@/pages/Speakers";
import { Register } from "@/pages/Register";

function Router() {
  return (
    <div className="page">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/program" component={Program} />
        <Route path="/program/:moduleIndex" component={Program} />
        <Route path="/speakers" component={Speakers} />
        <Route path="/register" component={Register} />
        <Route component={Home} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <ScrollToTop />
      <NavBar />
      <Router />
      <Footer />
    </WouterRouter>
  );
}

export default App;
