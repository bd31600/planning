import type { FC } from "react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../AuthProvider";
import "./Parametres.css";

export type Module = {
  id_module: number;
  nommodule: string;
};

export type AssociationModules = {
  id_assoc: number;
  id_module_majeur: number;
  id_module_mineur: number;
};

export type ModuleColor = {
  id_color: number;
  id_module: number;
  color: string;
};

const API_URL = import.meta.env.VITE_API_URL as string;

const Parametres: FC = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [assocs, setAssocs] = useState<AssociationModules[]>([]);
  const [editingMaj, setEditingMaj] = useState<number | null>(null);
  const [editedAssocs, setEditedAssocs] = useState<Record<number, boolean>>({});
  // module colors map: moduleId -> { id_color, color }
  const [moduleColors, setModuleColors] = useState<Record<number, { id_color: number; color: string }>>({});

  const fetchData = useCallback(async () => {
    const token = await user!.getIdToken();
    const resM = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "list", entity: "module_thematique" }),
    });
    const jsonM = await resM.json();
    if (resM.ok && jsonM.success) setModules(jsonM.data as Module[]);

    const resA = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "list", entity: "AssociationModules" }),
    });
    const jsonA = await resA.json();
    if (resA.ok && jsonA.success) setAssocs(jsonA.data as AssociationModules[]);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchColors = async () => {
      const token = await user!.getIdToken();
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "list", entity: "module_couleurs" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const map: Record<number, { id_color: number; color: string }> = {};
        (json.data as ModuleColor[]).forEach(c => {
          map[c.id_module] = { id_color: c.id_color, color: c.color };
        });
        setModuleColors(map);
      }
    };
    fetchColors();
  }, [user]);

  const handleEditRow = (majId: number) => {
    setEditingMaj(majId);
    const minors = modules.filter((m) => m.id_module !== majId);
    const current: Record<number, boolean> = {};
    minors.forEach((m) => {
      current[m.id_module] = assocs.some(
        (a) => a.id_module_majeur === majId && a.id_module_mineur === m.id_module
      );
    });
    setEditedAssocs(current);
  };

  const handleToggle = (minId: number) => {
    setEditedAssocs((prev) => ({ ...prev, [minId]: !prev[minId] }));
  };

  const handleSaveRow = async () => {
    if (editingMaj === null) return;
    const token = await user!.getIdToken();

    // Prepare API requests in parallel
    const requests = Object.entries(editedAssocs).map(async ([minIdStr, checked]) => {
      const minId = Number(minIdStr);
      const existing = assocs.find(
        a => a.id_module_majeur === editingMaj && a.id_module_mineur === minId
      );
      if (checked && !existing) {
        return fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            action: "insert",
            entity: "AssociationModules",
            payload: { id_module_majeur: editingMaj, id_module_mineur: minId }
          })
        });
      } else if (!checked && existing) {
        return fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            action: "delete",
            entity: "AssociationModules",
            payload: { id_assoc: existing.id_assoc }
          })
        });
      }
    });

    // Optimistically update local state
    setAssocs(current => {
      const filtered = current.filter(a => a.id_module_majeur !== editingMaj);
      const added = Object.entries(editedAssocs)
        .filter(([, checked]) => checked)
        .map(([minIdStr]) => ({
          id_assoc: -1,
          id_module_majeur: editingMaj!,
          id_module_mineur: Number(minIdStr)
        }));
      return [...filtered, ...added];
    });

    // Exit edit mode immediately
    setEditingMaj(null);
    setEditedAssocs({});

    // Fire API calls and refresh in background
    Promise.all(requests).then(() => fetchData());
  };

  const handleSaveClick = () => {
    if (confirm("Voulez-vous enregistrer les modifications ?")) {
      handleSaveRow();
    }
  };

  const handleColorChange = async (moduleId: number, newColor: string) => {
    const token = await user!.getIdToken();
    const existing = moduleColors[moduleId];
    if (existing) {
      // update
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "update",
          entity: "module_couleurs",
          payload: { id_color: existing.id_color, color: newColor },
        }),
      });
      setModuleColors(prev => ({ ...prev, [moduleId]: { id_color: existing.id_color, color: newColor } }));
    } else {
      // insert
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "insert",
          entity: "module_couleurs",
          payload: { id_module: moduleId, color: newColor },
        }),
      });
      const json = await res.json();
      if (res.ok && json.insertedId) {
        setModuleColors(prev => ({ ...prev, [moduleId]: { id_color: json.insertedId, color: newColor } }));
      }
    }
  };

  return (
    <div className="parametres-page">
      <h1>Paramètres</h1>
      <h2>Tableau des associations</h2>
      <div className="table-wrapper">
        <table className="assoc-table">
          <thead>
            <tr>
              <th>Majeur</th>
              <th>Mineur 1</th>
              <th>Mineur 2</th>
              <th>Mineur 3</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((majMod) => {
              const minors = modules
                .filter((m) => m.id_module !== majMod.id_module)
                .slice(0, 3);
              return (
                <tr key={majMod.id_module}>
                  <td>{majMod.nommodule}</td>
                  {minors.map((minMod) => (
                    <td key={minMod.id_module}>
                      <span className="min-label">{minMod.nommodule}</span>
                      <button
                        className="toggle-btn"
                        onClick={() => handleToggle(minMod.id_module)}
                      >
                        {editingMaj === majMod.id_module
                          ? editedAssocs[minMod.id_module]
                            ? "✅"
                            : "❌"
                          : assocs.some(
                              (a) =>
                                a.id_module_majeur === majMod.id_module &&
                                a.id_module_mineur === minMod.id_module
                            )
                          ? "✅"
                          : "❌"}
                      </button>
                    </td>
                  ))}
                  <td className="actions-cell">
                    <button
                      className="edit-btn"
                      onClick={
                        editingMaj === majMod.id_module
                          ? handleSaveClick
                          : () => handleEditRow(majMod.id_module)
                      }
                    >
                      {editingMaj === majMod.id_module ? "💾" : "✏️"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h2>Couleurs des modules</h2>
      <div className="color-list">
        {modules.map(mod => (
          <div key={mod.id_module} className="module-row">
            <span className="module-label">{mod.nommodule}</span>
            <input
              type="color"
              value={moduleColors[mod.id_module]?.color || "#ffffff"}
              onChange={e => handleColorChange(mod.id_module, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Parametres;