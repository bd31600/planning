import type { FC } from "react";
import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import Topbar from "./components/Topbar";
import Calendar from "./components/Calendar/Calendar";

type Role = "admin" | "intervenant" | "eleve";
import ElevesPage from "./pages/ElevesPage";
import IntervenantsPage from "./pages/IntervenantsPage";
import Parametres from "./pages/Parametres";
import "./App.css";

interface SuccessGetRole { success: true; role: Role; id: number | null; }
interface FailureResponse { success: false; error: string; }
type ApiResponse = SuccessGetRole | FailureResponse;

const API_URL = import.meta.env.VITE_API_URL as string;

const App: FC = () => {
  const { user, signInWithGoogle, logout } = useAuth();
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [message, setMessage] = useState("");

  const callApi = useCallback(
    async (body: { action: "getRole" }): Promise<ApiResponse> => {
      const token = await user!.getIdToken();
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(body),
      });
      let json: unknown;
      try { json = await res.json(); } catch { json = null; }
      if (!res.ok) {
        const err = (json as FailureResponse)?.error ?? res.statusText;
        throw new Error(`${res.status} ${err}`);
      }
      return json as ApiResponse;
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const resp = await callApi({ action: "getRole" });
        if (resp.success) setRole(resp.role);
      } catch (err: unknown) {
        setMessage(String(err));
        logout();
      }
    })();
  }, [user, callApi, logout]);

  if (!user) {
    return (
      <div className="App">
        <h1>Connexion</h1>
        <button onClick={signInWithGoogle}>Se connecter avec Google</button>
        {message && <p className="message">{message}</p>}
      </div>
    );
  }

  if (role === undefined) {
    return (
      <>
        <Topbar role={undefined} />
        <div className="App content">
          <p>Chargement du rôle…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar role={role} />

      <Routes>
        <Route
          path="/"
          element={
            <div className="calendar-fullwidth">
              <Calendar role={role} />
            </div>
          }
        />
        <Route
          path="/eleves"
          element={
            role === "admin" ? (
              <div className="App content"><ElevesPage /></div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/intervenants"
          element={
            role === "admin" ? (
              <div className="App content"><IntervenantsPage /></div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/parametres"
          element={
            role === "admin" ? (
              <div className="App content"><Parametres /></div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;