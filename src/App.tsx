import { useState, useEffect } from "react";
import type { FC } from "react";
import { useAuth } from "./AuthProvider";
import viteLogo from "/vite.svg";
import reactLogo from "./assets/react.svg";
import "./App.css";

type UserRow = { id: number; name: string; email: string };
type ApiAction =
  | { action: "list" }
  | { action: "insert"; name: string; email: string }
  | { action: "update"; id: number; name: string; email: string }
  | { action: "delete"; id: number };
interface ApiResponse {
  success: boolean;
  insertedId?: number;
  users?: UserRow[];
  error?: string;
  message?: string;
}

const App: FC = () => {
  const { user, signInWithGoogle, logout } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL as string;

  const [users, setUsers] = useState<UserRow[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  // 1) Charger la liste à la connexion
  useEffect(() => {
    if (!user) {
      setUsers([]);
      return;
    }
    (async () => {
      const token = await user.getIdToken();
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ action: "list" } as ApiAction),
      });
      const data: ApiResponse = await res.json();
      if (data.success && data.users) setUsers(data.users);
      else setMessage("Erreur récupération : " + (data.error || data.message));
    })();
  }, [user]);

  // 2) Handler générique CRUD
  const doAction = async (body: ApiAction, successMsg: string) => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(body),
    });
    const data: ApiResponse = await res.json();
    if (data.success) {
      setMessage(successMsg);
      if (body.action === "insert" && data.insertedId != null) {
        setUsers((prev) => [...prev, { id: data.insertedId, name, email }]);
      }
      if (body.action === "update" && body.id != null) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === body.id ? { ...u, name: body.name, email: body.email } : u
          )
        );
      }
      if (body.action === "delete") {
        setUsers((prev) => prev.filter((u) => u.id !== body.id));
      }
      setName("");
      setEmail("");
      setEditId(null);
    } else {
      setMessage("Erreur : " + (data.error || data.message));
    }
  };

  return (
    <div className="App">
      {/* Logos Vite + React */}
      <div className="logo-container">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <h1>Test intéractions base de données</h1>

      {!user ? (
        <div className="login-container">
          <h2>Connexion</h2>
          <button onClick={signInWithGoogle}>Se connecter avec Google</button>
          {message && <p className="message">{message}</p>}
        </div>
      ) : (
        <>
          <button onClick={logout} className="logout-button">
            Se déconnecter
          </button>
          <p className="message">{message}</p>

          <section className="form-section">
            <h2>{editId ? "Modifier" : "Ajouter"} un utilisateur</h2>
            <input
              type="text"
              placeholder="Nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {editId ? (
              <button
                onClick={() =>
                  doAction(
                    { action: "update", id: editId, name, email },
                    `Utilisateur ${editId} mis à jour.`
                  )
                }
              >
                Modifier
              </button>
            ) : (
              <button
                onClick={() =>
                  doAction({ action: "insert", name, email }, "Utilisateur ajouté.")
                }
              >
                Ajouter
              </button>
            )}
          </section>

          <section className="list-section">
            <h2>Liste des utilisateurs</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <button
                        onClick={() => {
                          setEditId(u.id);
                          setName(u.name);
                          setEmail(u.email);
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() =>
                          doAction(
                            { action: "delete", id: u.id },
                            `Utilisateur ${u.id} supprimé.`
                          )
                        }
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
};

export default App;
