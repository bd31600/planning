// src/pages/IntervenantsPage.tsx

import { type FC, useState, useEffect, useCallback } from "react";
import { useAuth } from "../AuthProvider";
import "./IntervenantsPage.css";

export type Module = {
  id_module: number;
  nommodule: string;
};

export type Intervenant = {
  id_intervenant: number;
  nom: string;
  prenom: string;
  referent: boolean;
  mailreferent: string;
  modules?: Module[];
};

interface ApiListResponse<T>  { success: true; data: T[]; }
interface ApiInsertResponse    { success: true; insertedId: number; }
interface ApiEmptyResponse     { success: true; }
interface ApiFailureResponse   { success: false; error: string; }

type ApiList<T>   = ApiListResponse<T>   | ApiFailureResponse;
type ApiInsert    = ApiInsertResponse    | ApiFailureResponse;
type ApiEmpty     = ApiEmptyResponse     | ApiFailureResponse;

const API_URL = import.meta.env.VITE_API_URL as string;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const IntervenantsPage: FC = () => {
  const { user } = useAuth();

  const [modules, setModules]           = useState<Module[]>([]);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [nom, setNom]                   = useState("");
  const [prenom, setPrenom]             = useState("");
  const [mail, setMail]                 = useState("");
  const [referent, setReferent]         = useState<boolean | null>(null);
  const [selectedMods, setSelectedMods] = useState<number[]>([]);
  const [editId, setEditId]             = useState<number | null>(null);
  const [errors, setErrors]             = useState<Record<string,string>>({});
  const [showForm, setShowForm]         = useState(false);
  const [search, setSearch]             = useState("");

  const fetchModules = useCallback(async () => {
    const token = await user!.getIdToken();
    const res   = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "list", entity: "module_thematique" }),
    });
    const json = (await res.json()) as ApiList<Module>;
    if (json.success) setModules(json.data);
    else console.error(json.error);
  }, [user]);

  const fetchIntervenants = useCallback(async () => {
    const token = await user!.getIdToken();
    const res   = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "list", entity: "intervenants" }),
    });
    const json = (await res.json()) as ApiList<Intervenant>;
    if (json.success) setIntervenants(json.data);
    else console.error(json.error);
  }, [user]);

  useEffect(() => {
    fetchModules();
    fetchIntervenants();
  }, [fetchModules, fetchIntervenants]);

  const callInsert = useCallback(async (entity: string, payload: unknown): Promise<number> => {
    const token = await user!.getIdToken();
    const res   = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "insert", entity, payload }),
    });
    const json = (await res.json()) as ApiInsert;
    if (json.success) return json.insertedId;
    throw new Error(json.error);
  }, [user]);

  const callEmpty = useCallback(async (entity: string, payload: unknown): Promise<void> => {
    const token = await user!.getIdToken();
    const res   = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "delete", entity, payload }),
    });
    const json = (await res.json()) as ApiEmpty;
    if (!json.success) throw new Error(json.error);
  }, [user]);

  const resetForm = () => {
    setEditId(null);
    setNom(""); setPrenom(""); setMail(""); setReferent(null);
    setSelectedMods([]); setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string,string> = {};
    if (!nom.trim())      newErrors.nom      = "Le nom est requis";
    if (!prenom.trim())   newErrors.prenom   = "Le prénom est requis";
    if (!mail.trim())     newErrors.mail     = "L’e-mail est requis";
    else if (!EMAIL_REGEX.test(mail)) newErrors.mail = "Format d’e-mail invalide";
    if (referent === null)          newErrors.referent = "Choisissez Oui ou Non";
    if (selectedMods.length === 0)   newErrors.modules  = "Au moins un module doit être sélectionné";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      let id: number;
      if (editId !== null) {
        await callInsert("intervenants", {
          id_intervenant: editId,
          nom, prenom,
          referent: referent!,
          mailreferent: mail,
        });
        id = editId;
      } else {
        id = await callInsert("intervenants", {
          nom, prenom,
          referent: referent!,
          mailreferent: mail,
        });
      }

      // update join table
      await callEmpty("intervenir", { id_intervenant: id });
      for (const mid of selectedMods) {
        await callInsert("intervenir", { id_intervenant: id, id_module: mid });
      }

      await fetchIntervenants();
      resetForm();
      setShowForm(false);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleEdit = (i: Intervenant) => {
    setEditId(i.id_intervenant);
    setNom(i.nom);
    setPrenom(i.prenom);
    setMail(i.mailreferent);
    setReferent(i.referent);
    setSelectedMods(i.modules?.map(m => m.id_module) || []);
    setErrors({}); setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await callEmpty("intervenir", { id_intervenant: id });
      await callEmpty("intervenants", { id_intervenant: id });
      setIntervenants(prev => prev.filter(x => x.id_intervenant !== id));
    } catch (err: unknown) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  };

  const filtered = intervenants.filter(i => {
    const q = search.toLowerCase();
    return (
      i.nom.toLowerCase().includes(q) ||
      i.prenom.toLowerCase().includes(q) ||
      (i.referent ? "oui" : "non").includes(q) ||
      i.mailreferent.toLowerCase().includes(q) ||
      (i.modules || []).some(m => m.nommodule.toLowerCase().includes(q))
    );
  });

  return (
    <div className="intervenants-page">
      {!showForm ? (
        <button className="toggle-form-btn" onClick={() => setShowForm(true)}>
          Ajouter un intervenant
        </button>
      ) : (
        <button className="toggle-form-btn" onClick={() => { resetForm(); setShowForm(false); }}>
          Annuler
        </button>
      )}

      <section className={`form-section${showForm ? " open" : ""}`}>
        <h2>{editId !== null ? "Modifier intervenant" : "Ajouter intervenant"}</h2>

        <div className="field">
          <input
            value={nom}
            placeholder="Nom"
            onChange={e => { setNom(e.target.value); setErrors({ ...errors, nom: "" }); }}
          />
          {errors.nom && <span className="error">{errors.nom}</span>}
        </div>

        <div className="field">
          <input
            value={prenom}
            placeholder="Prénom"
            onChange={e => { setPrenom(e.target.value); setErrors({ ...errors, prenom: "" }); }}
          />
          {errors.prenom && <span className="error">{errors.prenom}</span>}
        </div>

        <div className="field multiselect-field">
          <div className="modules-checkboxes">
            <label>
              Oui
              <input
                type="checkbox"
                checked={referent === true}
                onChange={() => { setReferent(true); setErrors({ ...errors, referent: "" }); }}
              />
            </label>
            <label>
              Non
              <input
                type="checkbox"
                checked={referent === false}
                onChange={() => { setReferent(false); setErrors({ ...errors, referent: "" }); }}
              />
            </label>
          </div>
          {errors.referent && <span className="error">{errors.referent}</span>}
        </div>

        <div className="field">
          <input
            type="email"
            value={mail}
            placeholder="Adresse e-mail"
            onChange={e => { setMail(e.target.value); setErrors({ ...errors, mail: "" }); }}
          />
          {errors.mail && <span className="error">{errors.mail}</span>}
        </div>

        <div className="field multiselect-field">
          <div className="modules-checkboxes">
            {modules.map(m => (
              <label key={m.id_module}>
                {m.nommodule}
                <input
                  type="checkbox"
                  checked={selectedMods.includes(m.id_module)}
                  onChange={() => {
                    setSelectedMods(prev =>
                      prev.includes(m.id_module)
                        ? prev.filter(x => x !== m.id_module)
                        : [...prev, m.id_module]
                    );
                    setErrors({ ...errors, modules: "" });
                  }}
                />
              </label>
            ))}
          </div>
          {errors.modules && <span className="error">{errors.modules}</span>}
        </div>

        <button className="save-btn" onClick={handleSave}>
          {editId !== null ? "Modifier" : "Ajouter"}
        </button>
      </section>

      <div className="search-field">
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <section className="list-section">
        <h2>Intervenants</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Nom</th><th>Prénom</th>
                <th>Référent</th><th>E-mail</th><th>Modules</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id_intervenant}>
                  <td>{i.id_intervenant}</td>
                  <td>{i.nom}</td>
                  <td>{i.prenom}</td>
                  <td>{i.referent ? "Oui" : "Non"}</td>
                  <td>{i.mailreferent}</td>
                  <td>{(i.modules || []).map(m => m.nommodule).join(", ")}</td>
                  <td className="actions-cell">
                    <button onClick={() => handleEdit(i)}>✏️</button>
                    <button onClick={() => handleDelete(i.id_intervenant)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default IntervenantsPage;