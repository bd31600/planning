import { type FC, useState, useEffect, useCallback } from "react";
import { useAuth } from "../AuthProvider";
import "./ElevesPage.css";

export type Module = {
  id_module: number;
  nommodule: string;
};

export type EleveWithMods = {
  id_eleve: number;
  nom: string;
  prenom: string;
  parcours: string;
  maileleve: string;
  id_module_majeur: number | null;
  nommodule_majeur: string | null;
  id_module_mineur: number | null;
  nommodule_mineur: string | null;
};

const API_URL = import.meta.env.VITE_API_URL as string;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PAIRS = [
  ["NID", "TEAMS"],
  ["A&S", "CD"],
];

const ElevesPage: FC = () => {
  const { user } = useAuth();

  const [eleves, setEleves]     = useState<EleveWithMods[]>([]);
  const [modules, setModules]   = useState<Module[]>([]);
  const [nom, setNom]           = useState("");
  const [prenom, setPrenom]     = useState("");
  const [parcours, setParcours] = useState("");
  const [mail, setMail]         = useState("");
  const [maj, setMaj]           = useState<number | "">("");
  const [min, setMin]           = useState<number | "">("");
  const [editId, setEditId]     = useState<number | null>(null);
  const [errors, setErrors]     = useState<Record<string,string>>({});
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]     = useState("");

  const callApi = useCallback(
    async (body: { action: string; entity?: string; payload?: unknown }) => {
      const token = await user!.getIdToken();
      const res   = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      return json;
    },
    [user]
  );

  useEffect(() => {
    (async () => {
      try {
        const m = await callApi({ action: "list", entity: "module_thematique" });
        setModules(m.data as Module[]);
        const e = await callApi({ action: "list", entity: "eleves" });
        setEleves(e.data as EleveWithMods[]);
      } catch (_err: unknown) {
        console.error(_err);
      }
    })();
  }, [callApi]);

  const resetForm = () => {
    setEditId(null);
    setNom(""); setPrenom(""); setParcours(""); setMail("");
    setMaj(""); setMin("");
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string,string> = {};
    if (!nom.trim())      newErrors.nom      = "Le nom est requis";
    if (!prenom.trim())   newErrors.prenom   = "Le prénom est requis";
    if (!parcours.trim()) newErrors.parcours = "Le parcours est requis";

    if (!mail.trim()) {
      newErrors.mail = "L’adresse e-mail est requise";
    } else if (!EMAIL_REGEX.test(mail)) {
      newErrors.mail = "Format d’e-mail invalide";
    }

    if (maj === "") newErrors.maj = "Module majeur requis";
    if (min === "") newErrors.min = "Module mineur requis";

    if (maj !== "" && min !== "") {
      const nomMaj = modules.find(m => m.id_module === maj)?.nommodule;
      const nomMin = modules.find(m => m.id_module === min)?.nommodule;
      const ok = VALID_PAIRS.some(
        ([a, b]) =>
          (nomMaj === a && nomMin === b) ||
          (nomMaj === b && nomMin === a)
      );
      if (!ok) {
        const msg = "Paire invalide (NID+TEAMS ou A&S+CD)";
        newErrors.maj = msg;
        newErrors.min = msg;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      let id: number;
      if (editId !== null) {
        await callApi({
          action: "update",
          entity: "eleves",
          payload: { id_eleve: editId, nom, prenom, parcours, maileleve: mail },
        });
        id = editId;
      } else {
        const resp = await callApi({
          action: "insert",
          entity: "eleves",
          payload: { nom, prenom, parcours, maileleve: mail },
        });
        id = resp.insertedId;
      }

      await callApi({
        action: "insert",
        entity: "etudier",
        payload: { id_eleve: id, id_module_majeur: maj, id_module_mineur: min },
      });

      const listResp = await callApi({ action: "list", entity: "eleves" });
      setEleves(listResp.data as EleveWithMods[]);
      resetForm();
      setShowForm(false);
    } catch (_err: unknown) {
      console.error(_err);
    }
  };

  const handleEdit = (e: EleveWithMods) => {
    setEditId(e.id_eleve);
    setNom(e.nom);
    setPrenom(e.prenom);
    setParcours(e.parcours);
    setMail(e.maileleve);
    setMaj(e.id_module_majeur ?? "");
    setMin(e.id_module_mineur ?? "");
    setErrors({});
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await callApi({ action: "delete", entity: "eleves", payload: { id_eleve: id } });
      setEleves(prev => prev.filter(x => x.id_eleve !== id));
    } catch (_err: unknown) {
      console.error(_err);
    }
  };

  const filtered = eleves.filter(e => {
    const q = search.toLowerCase();
    return (
      e.nom.toLowerCase().includes(q) ||
      e.prenom.toLowerCase().includes(q) ||
      e.parcours.toLowerCase().includes(q) ||
      e.nommodule_majeur?.toLowerCase().includes(q) ||
      e.nommodule_mineur?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {!showForm ? (
        <button className="toggle-form-btn" onClick={() => setShowForm(true)}>
          Ajouter un élève
        </button>
      ) : (
        <button className="toggle-form-btn" onClick={() => { resetForm(); setShowForm(false); }}>
          Annuler
        </button>
      )}

      <section className={`form-section${showForm ? " open" : ""}`}>
        <h2>{editId !== null ? "Modifier un élève" : "Ajouter un élève"}</h2>

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

        <div className="field">
          <input
            value={parcours}
            placeholder="Parcours"
            onChange={e => { setParcours(e.target.value); setErrors({ ...errors, parcours: "" }); }}
          />
          {errors.parcours && <span className="error">{errors.parcours}</span>}
        </div>

        <div className="field">
          <input
            value={mail}
            placeholder="Mail"
            onChange={e => { setMail(e.target.value); setErrors({ ...errors, mail: "" }); }}
          />
          {errors.mail && <span className="error">{errors.mail}</span>}
        </div>

        <div className="field">
          <select
            value={maj}
            onChange={e => { setMaj(Number(e.target.value)); setErrors({ ...errors, maj: "" }); }}
          >
            <option value="">— Module majeur —</option>
            {modules.map(m => (
              <option key={m.id_module} value={m.id_module}>{m.nommodule}</option>
            ))}
          </select>
          {errors.maj && <span className="error">{errors.maj}</span>}
        </div>

        <div className="field">
          <select
            value={min}
            onChange={e => { setMin(Number(e.target.value)); setErrors({ ...errors, min: "" }); }}
          >
            <option value="">— Module mineur —</option>
            {modules.map(m => (
              <option key={m.id_module} value={m.id_module}>{m.nommodule}</option>
            ))}
          </select>
          {errors.min && <span className="error">{errors.min}</span>}
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
        <h2>Liste des élèves</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Nom</th><th>Prénom</th><th>Parcours</th>
                <th>Majeur</th><th>Mineur</th><th>Mail</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id_eleve}>
                  <td>{e.id_eleve}</td>
                  <td>{e.nom}</td>
                  <td>{e.prenom}</td>
                  <td>{e.parcours}</td>
                  <td>{e.nommodule_majeur || "—"}</td>
                  <td>{e.nommodule_mineur || "—"}</td>
                  <td>{e.maileleve}</td>
                  <td className="actions-cell">
                    <button onClick={() => handleEdit(e)}>✏️</button>
                    <button onClick={() => handleDelete(e.id_eleve)}>🗑️</button>
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

export default ElevesPage;