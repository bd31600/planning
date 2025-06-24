import React, { useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../AuthProvider';
const API_URL = import.meta.env.VITE_API_URL as string;

interface IntervenantOption {
  id_intervenant: number;
  nom: string;
  prenom: string;
}
interface ModuleOption {
  id_module: number;
  nommodule: string;
  type_module: 'majeur' | 'mineur';
}
interface SalleOption {
  id_salle: number;
  batiment: string;
  numerosalle: string;
  capacite: number;
}

interface EditCourseFormProps {
  intervenantOptions: IntervenantOption[];
  moduleOptions: ModuleOption[];
  salleOptions: SalleOption[];
  course: {
    id_cours: number;
    typecours: string;
    matiere: string;
    debut_cours: string;
    fin_cours: string;
    description: string;
    parcours: 'Apprenti' | 'Intégré' | 'Tous';
    intervenants: number[];
    modules: number[];
    salles: number[];
  };
  initialStart?: string;
  initialEnd?: string;
  onUpdate: (data: {
    id_cours: number;
    typecours: string;
    matiere: string;
    debut_cours: string;
    fin_cours: string;
    description: string;
    parcours: 'Apprenti' | 'Intégré' | 'Tous';
    intervenants: number[];
    modules: number[];
    salles: number[];
  }) => void | Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
  onCancel: () => void;
}

const EditCourseForm: React.FC<EditCourseFormProps> = ({
  intervenantOptions,
  moduleOptions,
  salleOptions,
  course,
  initialStart,
  initialEnd,
  onUpdate,
  onDelete,
  onCancel,
}) => {
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

  // Handle modules that may be number IDs or objects { id_module, type_module }
  type ModuleLike = number | { id_module: number; type_module?: 'majeur' | 'mineur' };

  // course.modules may already be an array of ids or of objects; coerce accordingly without using `any`.
  const modulesRaw: ModuleLike[] = Array.isArray(course.modules)
    ? (course.modules as ModuleLike[])
    : [];

  // Helper to find type from moduleOptions when missing
  const getTypeForId = (id: number): 'majeur' | 'mineur' =>
    moduleOptions.find(m => m.id_module === id)?.type_module || 'majeur';

  // Deduplicated major/minor ID sets
  const majorSet = new Set<number>();
  const minorSet = new Set<number>();

  modulesRaw.forEach(m => {
    const id = typeof m === 'number' ? m : m.id_module;
    if (!id || isNaN(id)) return; // ignore undefined / invalid ids
    const type = typeof m === 'number'
      ? getTypeForId(id)
      : (m.type_module || getTypeForId(id));
    if (type === 'mineur') {
      minorSet.add(id);
    } else {
      majorSet.add(id);
    }
  });

  const majorIds = Array.from(majorSet);
  const minorIds = Array.from(minorSet);

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
    typecours: course.typecours,
    matiere: course.matiere,
    debut_cours: initialStart || course.debut_cours,
    fin_cours: initialEnd || course.fin_cours,
    description: course.description || '',
    parcours: [course.parcours],
    intervenants: [...course.intervenants],
    modules: [majorIds, minorIds],
    batiments: (() => {
      const bats = salleOptions
        .filter(s => course.salles.includes(s.id_salle))
        .map(s => s.batiment);
      return Array.from(new Set(bats));
    })(),
    salles: [...course.salles],
  });

  const [salleError, setSalleError] = useState<string>('');

  // Compute module lists that always contain options
  const majorsToDisplay = moduleOptions.some(m => m.type_module === 'majeur')
    ? moduleOptions.filter(m => m.type_module === 'majeur')
    : moduleOptions;
  const minorsToDisplay = moduleOptions.some(m => m.type_module === 'mineur')
    ? moduleOptions.filter(m => m.type_module === 'mineur')
    : moduleOptions;

  // ---- Rooms helpers ----
  const batimentOpts = Array.from(new Set(salleOptions.map(s => s.batiment)));
  const salleOptsFiltered = salleOptions.filter(s =>
    formValues.batiments.length === 0 || formValues.batiments.includes(s.batiment)
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSalleError('');
    try {
      // Update main course
      await callApi({
        action: 'update',
        entity: 'Cours',
        payload: {
          id_cours: course.id_cours,
          typecours: formValues.typecours,
          matiere: formValues.matiere,
          debut_cours: formValues.debut_cours,
          fin_cours: formValues.fin_cours,
          description: formValues.description,
          parcours: formValues.parcours[0] || 'Tous',
        },
      });

      // Re-link intervenants: delete old and insert new
      await callApi({ action: 'delete', entity: 'enseigner', payload: { id_cours: course.id_cours } });
      // Ne créer que les liens vers des intervenants existants
      const validIntervenants = formValues.intervenants.filter(id =>
        intervenantOptions.some(opt => opt.id_intervenant === id)
      );
      if (validIntervenants.length) {
        await Promise.all(
          validIntervenants.map(id =>
            callApi({
              action: 'insert',
              entity: 'enseigner',
              payload: { id_cours: course.id_cours, id_intervenant: Number(id) },
            })
          )
        );
      }

      // Re-link modules: delete old and insert selected
      await callApi({ action: 'delete', entity: 'CoursModules', payload: { id_cours: course.id_cours } });
      const [majeurs, mineurs] = formValues.modules;
      await Promise.all([
        ...majeurs.map(id =>
          callApi({ action: 'insert', entity: 'CoursModules', payload: { id_cours: course.id_cours, id_module: Number(id), type_module: 'majeur' } })
        ),
        ...mineurs.map(id =>
          callApi({ action: 'insert', entity: 'CoursModules', payload: { id_cours: course.id_cours, id_module: Number(id), type_module: 'mineur' } })
        ),
      ]);

      // Re-link salles with conflict check and detailed error per salle
      await callApi({ action: 'delete', entity: 'effectuer', payload: { id_cours: course.id_cours } });
      const failed: string[] = [];
      for (const id of formValues.salles) {
        try {
          await callApi({
            action: 'insert',
            entity: 'effectuer',
            payload: { id_cours: course.id_cours, id_salle: Number(id) },
          });
        } catch {
          const salle = salleOptions.find(s => s.id_salle === id);
          failed.push(salle ? `${salle.batiment}-${salle.numerosalle}` : String(id));
        }
      }
      if (failed.length > 0) {
        const prefix = failed.length > 1 ? 'Les salles' : 'La salle';
        const verb = failed.length > 1 ? 'sont' : 'est';
        const pluralSuffix = failed.length > 1 ? 's' : '';
        setSalleError(
          `${prefix} ${failed.join(', ')} ${verb} déjà réservée${pluralSuffix} pour ce créneau.`
        );
        return;
      }

      // Notify parent and close
      onUpdate({
        id_cours: course.id_cours,
        typecours: formValues.typecours,
        matiere: formValues.matiere,
        debut_cours: formValues.debut_cours,
        fin_cours: formValues.fin_cours,
        description: formValues.description,
        parcours: formValues.parcours[0] || 'Tous',
        intervenants: formValues.intervenants,
        modules: [...majeurs, ...mineurs],
        salles: formValues.salles,
      });
      onCancel();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      alert('Erreur lors de la modification : ' + message);
    }
  };

  const handleDeleteClick = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce cours ?')) return;
    try {
      // 1) Supprimer les liens intervenants
      await callApi({ action: 'delete', entity: 'enseigner', payload: { id_cours: course.id_cours } });
      // 2) Supprimer les liens modules
      await callApi({ action: 'delete', entity: 'CoursModules', payload: { id_cours: course.id_cours } });
      // 3) Supprimer les liens des salles (effectuer)
      await callApi({ action: 'delete', entity: 'effectuer', payload: { id_cours: course.id_cours } });
      // 4) Supprimer le cours
      await callApi({ action: 'delete', entity: 'Cours', payload: { id_cours: course.id_cours } });

      onDelete(course.id_cours);
      onCancel();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      alert('Erreur lors de la suppression : ' + message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="type-row">
        <div className="field">
          <label>Type de cours</label>
          <input
            type="text"
            value={formValues.typecours}
            onChange={e => setFormValues({ ...formValues, typecours: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>Intitulé du cours</label>
          <input
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
        <label>Description</label>
        <textarea
          rows={3}
          value={formValues.description}
          onChange={e => setFormValues({ ...formValues, description: e.target.value })}
        />
      </div>
      <div className="select-row">
        <div className="field">
          <label>Parcours</label>
          <select
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
            {intervenantOptions.map(i => (
              <option key={i.id_intervenant} value={i.id_intervenant}>
                {i.nom} {i.prenom}{formValues.intervenants.includes(i.id_intervenant) ? " ✓" : ""}
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
              const bat = e.target.value;
              if (!bat) return;
              const isSel = formValues.batiments.includes(bat);
              const newBats = isSel
                ? formValues.batiments.filter(b => b !== bat)
                : [...formValues.batiments, bat];
              // remove salles that no longer match any selected batiment
              const newSalles = formValues.salles.filter(id => {
                const s = salleOptions.find(sl => sl.id_salle === id);
                return s ? newBats.includes(s.batiment) : false;
              });
              setFormValues({ ...formValues, batiments: newBats, salles: newSalles });
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
            {salleOptsFiltered.map(s => (
              <option key={s.id_salle} value={s.id_salle}>
                {`${s.batiment}-${s.numerosalle} (${s.capacite})`}{formValues.salles.includes(s.id_salle) ? ' ✓' : ''}
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
              const newMajors = isSelected
                ? formValues.modules[0].filter(x => x !== id)
                : [...formValues.modules[0], id];
              setFormValues({ ...formValues, modules: [newMajors, formValues.modules[1]] });
            }}
          >
            <option value="" disabled>
              {formValues.modules[0].length === 0
                ? "Aucun sélectionné"
                : `${formValues.modules[0].length} sélectionné(s)`}
            </option>
            {majorsToDisplay.map(m => (
              <option key={m.id_module} value={m.id_module}>
                {m.nommodule}{formValues.modules[0].includes(m.id_module) ? " ✓" : ""}
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
              const newMinors = isSelected
                ? formValues.modules[1].filter(x => x !== id)
                : [...formValues.modules[1], id];
              setFormValues({ ...formValues, modules: [formValues.modules[0], newMinors] });
            }}
          >
            <option value="" disabled>
              {formValues.modules[1].length === 0
                ? "Aucun sélectionné"
                : `${formValues.modules[1].length} sélectionné(s)`}
            </option>
            {minorsToDisplay.map(m => (
              <option key={m.id_module} value={m.id_module}>
                {m.nommodule}{formValues.modules[1].includes(m.id_module) ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
        <button type="submit">Modifier</button>
        <button type="button" onClick={handleDeleteClick}>Supprimer</button>
        <button type="button" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
};

export default EditCourseForm;