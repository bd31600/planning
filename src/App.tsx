// src/App.tsx

import { type FC, useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import Topbar from "./components/Topbar";
import ElevesPage from "./pages/ElevesPage";
import IntervenantsPage from "./pages/IntervenantsPage";
import "./App.css";

type Role = "admin" | "intervenant" | "eleve";

interface SuccessGetRole  { success: true; role: Role; id: number | null; }
interface FailureResponse { success: false; error: string; }
type ApiResponse = SuccessGetRole | FailureResponse;

const API_URL = import.meta.env.VITE_API_URL as string;

const App: FC = () => {
  const { user, signInWithGoogle, logout } = useAuth();
  const [role, setRole]       = useState<Role | undefined>(undefined);
  const [message, setMessage] = useState<string>("");

  const callApi = useCallback(
    async (body: { action: "getRole" }): Promise<ApiResponse> => {
      const token = await user!.getIdToken();
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  "Bearer " + token,
        },
        body: JSON.stringify(body),
      });
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      if (!res.ok) {
        const err = (json as FailureResponse).error ?? res.statusText;
        throw new Error(`${res.status} ${err}`);
      }
      return json as ApiResponse;
    },
    [user]
  );

  // 1) on connecte, on charge le rôle
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const resp = await callApi({ action: "getRole" });
        if (resp.success) {
          setRole(resp.role);
        }
      } catch (_err: unknown) {
        setMessage(String(_err));
        logout();
      }
    })();
  }, [user, callApi, logout]);

  // écran de connexion
  if (!user) {
    return (
      <div className="App">
        <h1>Connexion</h1>
        <button onClick={signInWithGoogle}>Se connecter avec Google</button>
        {message && <p className="message">{message}</p>}
      </div>
    );
  }

  // rôle en cours de chargement
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
      <div className="App content">
        <Routes>
          {/* page d'accueil */}
          <Route path="/" element={<></>} />

          {/* /eleves accessible seulement aux admins */}
          <Route
            path="/eleves"
            element={
              role === "admin" ? (
                <ElevesPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* /intervenants accessible seulement aux admins */}
          <Route
            path="/intervenants"
            element={
              role === "admin" ? (
                <IntervenantsPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* rediriger toute autre route vers l'accueil */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
};

export default App;