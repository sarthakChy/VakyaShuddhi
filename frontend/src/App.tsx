import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Paraphrase from "./pages/Paraphrase";
import Grammar from "./pages/Grammar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./utils/ProtectedRoute";
import History from "./pages/History";
import Upgrade from "./pages/Upgrade";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/upgrade" element={<Upgrade />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/paraphrase" element={<Paraphrase />} />
        <Route path="/grammar" element={<Grammar />} />
        <Route path="/history" element={<History />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
