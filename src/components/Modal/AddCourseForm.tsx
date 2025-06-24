import React, { useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../AuthProvider';
type Option = { value: number; label: string };
const API_URL = import.meta.env.VITE_API_URL as string;

interface AddCourseFormProps {
  intervenantOptions: { id_intervenant: number; nom: string; prenom: string }[];
  moduleOptions: { id_module: number; nommodule: string; type_module: 'majeur' | 'mineur' }[];
  salleOptions: { id_salle: number; batiment: string; numerosalle: string; capacite: number }[];
  initialStart?: string;
  initialEnd?: string;
  onSubmit: (data: {
    typecours: string;
    matiere: string;
    debut_cours: string;
    fin_cours: string;
    description: string;
    parcours: Array<'Apprenti' | 'Intégré' | 'Tous'>;
    intervenants: number[];
    modules: number[];
    salles: number[];
  }) => void | Promise<void>;
  onCancel: () => void;
}

const AddCourseForm: React.FC<AddCourseFormProps> = ({ intervenantOptions, moduleOptions, salleOptions = [], initialStart = '', initialEnd = '', onSubmit, onCancel }) => {
  const [formValues, setFormValues] = useState<{ 
    typecours: string;
    matiere: string;
    debut_cours: string;
    fin_cours: string;
    description: string;
    parcours: Array<'Apprenti' | 'Intégré' | 'Tous'>;
    intervenants: number[];
    modules: [number[], number[]];
    batiments: string[];
    salles: number[];
  }>({
    typecours: '',
    matiere: '',
    debut_cours: initialStart,
    fin_cours: initialEnd,
    description: '',
    parcours: [],
    intervenants: [],
    modules: [[], []],
    batiments: [],
    salles: [],
  });

  const [moduleError, setModuleError] = useState<string>('');
  const [salleError, setSalleError] = useState<string>('');

  // Authenticated API helper
  const { user } = useAuth();
  const callApi = useCallback(
    async (body: { action: string; entity: string; payload?: unknown }) => {
      const token = await user!.getIdToken();
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSalleError('');
    // Validate at least one module selected
    const totalModules = formValues.modules[0].length + formValues.modules[1].length;
    if (totalModules === 0) {
      setModuleError('Veuillez choisir un module');
      return;
    }
    setModuleError('');
    try {
      // Create main course
      const { insertedId: newCourseId } = await callApi({
        action: 'insert',
        entity: 'Cours',
        payload: {
          typecours: formValues.typecours,
          matiere: formValues.matiere,
          debut_cours: formValues.debut_cours,
          fin_cours: formValues.fin_cours,
          description: formValues.description,
          parcours: formValues.parcours[0] || '',
        },
      }) as { insertedId: number };

      // Link intervenants
      await Promise.all(
        formValues.intervenants.map(id =>
          callApi({ action: 'insert', entity: 'enseigner', payload: { id_intervenant: id, id_cours: newCourseId } })
        )
      );

      // Link modules
      const [majeurs, mineurs] = formValues.modules;
      await Promise.all([
        ...majeurs.map(id =>
          callApi({ action: 'insert', entity: 'CoursModules', payload: { id_cours: newCourseId, id_module: id, type_module: 'majeur' } })
        ),
        ...mineurs.map(id =>
          callApi({ action: 'insert', entity: 'CoursModules', payload: { id_cours: newCourseId, id_module: id, type_module: 'mineur' } })
        ),
      ]);

      // Attempt to link each salle, collect any that fail
      const failed: string[] = [];
      for (const id of formValues.salles) {
        try {
          await callApi({
            action: 'insert',
            entity: 'effectuer',
            payload: { id_salle: id, id_cours: newCourseId },
          });
        } catch {
          // Collect building-room label for errors
          const salle = salleOptions.find(s => s.id_salle === id);
          failed.push(salle ? `${salle.batiment}-${salle.numerosalle}` : String(id));
        }
      }
      if (failed.length > 0) {
        // Rollback created course and intervenant links on conflict
        try {
          await callApi({ action: 'delete', entity: 'enseigner', payload: { id_cours: newCourseId } });
        } catch {
          // ignore
        }
        try {
          await callApi({ action: 'delete', entity: 'Cours', payload: { id_cours: newCourseId } });
        } catch {
          // ignore
        }
        const plural = failed.length > 1;
        const prefix = plural ? 'Les salles' : 'La salle';
        setSalleError(
          `${prefix} ${failed.join(', ')} ${plural ? 'sont' : 'est'} déjà réservée${plural ? 's' : ''} pour ce créneau.`
        );
        return;
      }

      // Notify parent and close
      onSubmit({
        typecours: formValues.typecours,
        matiere: formValues.matiere,
        debut_cours: formValues.debut_cours,
        fin_cours: formValues.fin_cours,
        description: formValues.description,
        parcours: formValues.parcours,
        intervenants: formValues.intervenants,
        modules: [...majeurs, ...mineurs],
        salles: formValues.salles,
      });
      onCancel();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      alert('Erreur lors de l’ajout du cours : ' + message);
    }
  };

  const allModuleOpts: Option[] = moduleOptions.map(m => ({ value: m.id_module, label: m.nommodule }));

  const moduleMajOpts: Option[] = (() => {
    const majors = moduleOptions
      .filter(m => m.type_module === 'majeur')
      .map(m => ({ value: m.id_module, label: m.nommodule }));
    return majors.length ? majors : allModuleOpts;
  })();

  const moduleMinOpts: Option[] = (() => {
    const minors = moduleOptions
      .filter(m => m.type_module === 'mineur')
      .map(m => ({ value: m.id_module, label: m.nommodule }));
    return minors.length ? minors : allModuleOpts;
  })();

  const batimentOpts: string[] = Array.from(new Set(salleOptions.map(s => s.batiment)));

  const filteredSalleOpts: Option[] = salleOptions
    .filter(r =>
      formValues.batiments.length === 0 || formValues.batiments.includes(r.batiment)
    )
    .map(r => ({
      value: r.id_salle,
      label: `${r.batiment}-${r.numerosalle} (${r.capacite})`,
    }));

  return (
    <form onSubmit={handleSubmit}>
      <div className="type-row">
        <div className="field">
          <label htmlFor="typecours">Type de cours</label>
          <input
            id="typecours"
            type="text"
            value={formValues.typecours}
            onChange={e => setFormValues({ ...formValues, typecours: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="matiere">Intitulé du cours</label>
          <input
            id="matiere"
            type="text"
            value={formValues.matiere}
            onChange={e => setFormValues({ ...formValues, matiere: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="date-row">
        <div className="field">
          <label>Horaire de début</label>
          <input
            type="datetime-local"
            value={formValues.debut_cours}
            onChange={e => setFormValues({ ...formValues, debut_cours: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>Horaire de fin</label>
          <input
            type="datetime-local"
            value={formValues.fin_cours}
            onChange={e => setFormValues({ ...formValues, fin_cours: e.target.value })}
            required
          />
        </div>
      </div>
      <div>
        <label>Description:</label>
        <textarea
          value={formValues.description}
          onChange={e => setFormValues({ ...formValues, description: e.target.value })}
        />
      </div>
      <div className="select-row">
        <div className="field">
          <label>Parcours</label>
          <select
            className="parcours-select"
            value={formValues.parcours[0] || ''}
            onChange={e => {
              const val = e.target.value as 'Intégré' | 'Apprenti' | 'Tous';
              setFormValues({ ...formValues, parcours: val ? [val] : [] });
            }}
            required
          >
            <option value="">— Choisir parcours —</option>
            {(['Intégré', 'Apprenti', 'Tous'] as const).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Intervenants</label>
          <select
            value=""
            onChange={e => {
              const id = Number(e.target.value);
              if (isNaN(id)) return;
              const isSelected = formValues.intervenants.includes(id);
              const newList = isSelected
                ? formValues.intervenants.filter(x => x !== id)
                : [...formValues.intervenants, id];
              setFormValues({ ...formValues, intervenants: newList });
            }}
          >
            <option value="" disabled>
              {formValues.intervenants.length === 0
                ? "Aucun sélectionné"
                : `${formValues.intervenants.length} sélectionné(s)`}
            </option>
            {intervenantOptions.map(interv => (
              <option key={interv.id_intervenant} value={interv.id_intervenant}>
                {`${interv.prenom} ${interv.nom}`}{formValues.intervenants.includes(interv.id_intervenant) ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="module-row">
        <div className="field">
          <label>Bâtiment(s)</label>
          <select
            value=""
            onChange={e => {
              const val = e.target.value;
              if (!val) return;
              const isSel = formValues.batiments.includes(val);
              const newList = isSel
                ? formValues.batiments.filter(b => b !== val)
                : [...formValues.batiments, val];
              // Retire toute salle ne correspondant plus aux bâtiments sélectionnés
              const newSalles = formValues.salles.filter(id => {
                const salle = salleOptions.find(s => s.id_salle === id);
                return salle ? newList.includes(salle.batiment) : false;
              });
              setFormValues({ ...formValues, batiments: newList, salles: newSalles });
            }}
          >
            <option value="" disabled>
              {formValues.batiments.length === 0
                ? 'Aucun sélectionné'
                : `${formValues.batiments.length} sélectionné(s)`}
            </option>
            {batimentOpts.map(b => (
              <option key={b} value={b}>
                {b}{formValues.batiments.includes(b) ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Salle(s)</label>
          <select
            value=""
            onChange={e => {
              const id = Number(e.target.value);
              if (isNaN(id)) return;
              const isSel = formValues.salles.includes(id);
              const list = isSel ? formValues.salles.filter(x => x !== id) : [...formValues.salles, id];
              setFormValues({ ...formValues, salles: list });
            }}
          >
            <option value="" disabled>
              {formValues.salles.length === 0 ? 'Aucun sélectionné' : `${formValues.salles.length} sélectionné(s)`}
            </option>
            {filteredSalleOpts.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}{formValues.salles.includes(opt.value) ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      {salleError && (
        <div className="error-message">
          {salleError}
        </div>
      )}
      <div className="module-row">
        <div className="field">
          <label>Module(s) majeur(s)</label>
          <select
            value=""
            onChange={e => {
              const id = Number(e.target.value);
              if (isNaN(id)) return;
              const isSelected = formValues.modules[0].includes(id);
              const newList = isSelected
                ? formValues.modules[0].filter(x => x !== id)
                : [...formValues.modules[0], id];
              setFormValues({ ...formValues, modules: [newList, formValues.modules[1]] });
            }}
          >
            <option value="" disabled>
              {formValues.modules[0].length === 0
                ? "Aucun sélectionné"
                : `${formValues.modules[0].length} sélectionné(s)`}
            </option>
            {moduleMajOpts.map(mod => (
              <option key={mod.value} value={mod.value}>
                {mod.label}{formValues.modules[0].includes(mod.value) ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Module(s) mineur(s)</label>
          <select
            value=""
            onChange={e => {
              const id = Number(e.target.value);
              if (isNaN(id)) return;
              const isSelected = formValues.modules[1].includes(id);
              const newList = isSelected
                ? formValues.modules[1].filter(x => x !== id)
                : [...formValues.modules[1], id];
              setFormValues({ ...formValues, modules: [formValues.modules[0], newList] });
            }}
          >
            <option value="" disabled>
              {formValues.modules[1].length === 0
                ? "Aucun sélectionné"
                : `${formValues.modules[1].length} sélectionné(s)`}
            </option>
            {moduleMinOpts.map(mod => (
              <option key={mod.value} value={mod.value}>
                {mod.label}{formValues.modules[1].includes(mod.value) ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      {moduleError && (
        <div className="error-message">
          {moduleError}
        </div>
      )}
      <div className="modal-actions">
        <button type="submit">Ajouter le cours</button>
        <button type="button" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
};

export default AddCourseForm;