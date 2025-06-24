import { useState } from 'react';
import type { FormEvent } from 'react';
import './Modal.css';
import type { ProposeCourseFormProps } from './types';

const ProposeCourseForm: React.FC<ProposeCourseFormProps> = ({
  referentOptions,
  moduleOptions,
  initialStart,
  initialEnd,
  onCancel,
  onPropose,
}) => {
  // modules: [majeurs, mineurs]
  const [form, setForm] = useState({
    typecours: '',
    matiere: '',
    debut_cours: initialStart ?? '',
    fin_cours: initialEnd ?? '',
    description: '',
    parcours: '' as '' | 'Apprenti' | 'Intégré' | 'Tous',
    referents: [] as number[],
    modules: [[], []] as [number[], number[]],
  });

  const updateArray = (arr: number[], id: number) =>
    arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Construit le payload dans le format attendu par onPropose
    const payload = {
      typecours:   form.typecours,
      matiere:     form.matiere,
      debut_cours: form.debut_cours,
      fin_cours:   form.fin_cours,
      description: form.description,
      parcours:    form.parcours ? [form.parcours] : [],
      referents:   [...form.referents],
      modules:     [...form.modules[0], ...form.modules[1]],
    };

    // Envoie le même payload au backend (si nécessaire)
    await fetch('/api/sendProposalMail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Informe le parent
    onPropose(payload);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Type & Intitulé */}
      <div className="type-row">
        <div className="field">
          <label>Type de cours</label>
          <input
            type="text"
            value={form.typecours}
            onChange={e => setForm({ ...form, typecours: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>Intitulé du cours</label>
          <input
            type="text"
            value={form.matiere}
            onChange={e => setForm({ ...form, matiere: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Dates */}
      <div className="date-row">
        <div className="field">
          <label>Horaire de début</label>
          <input
            type="datetime-local"
            value={form.debut_cours}
            onChange={e => setForm({ ...form, debut_cours: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>Horaire de fin</label>
          <input
            type="datetime-local"
            value={form.fin_cours}
            onChange={e => setForm({ ...form, fin_cours: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Description */}
      <div className="field">
        <label>Description</label>
        <textarea
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />
      </div>

      {/* Parcours & Référents */}
      <div className="select-row">
        <div className="field">
          <label>Parcours</label>
          <select
            value={form.parcours}
            onChange={e => {
              const val = e.target.value as '' | 'Apprenti' | 'Intégré' | 'Tous';
              setForm({ ...form, parcours: val });
            }}
          >
            <option value="">— Choisir parcours —</option>
            {(['Intégré', 'Apprenti', 'Tous'] as const).map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Référent(s)</label>
          <select
            value=""
            onChange={e => {
              const id = Number(e.target.value);
              if (!id) return;
              setForm({ ...form, referents: updateArray(form.referents, id) });
            }}
          >
            <option value="" disabled>
              {form.referents.length === 0
                ? 'Aucun sélectionné'
                : `${form.referents.length} sélectionné(s)`}
            </option>
            {referentOptions.map(r => (
              <option key={r.id_intervenant} value={r.id_intervenant}>
                {r.nom} {r.prenom}
                {form.referents.includes(r.id_intervenant) ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Modules */}
      <div className="module-row">
        <div className="field">
          <label>Module(s) majeur(s)</label>
          <select
            value=""
            onChange={e => {
              const id = Number(e.target.value);
              if (!id) return;
              setForm({
                ...form,
                modules: [updateArray(form.modules[0], id), form.modules[1]],
              });
            }}
          >
            <option value="" disabled>
              {form.modules[0].length === 0
                ? 'Aucun sélectionné'
                : `${form.modules[0].length} sélectionné(s)`}
            </option>
            {moduleOptions
              .filter(m => m.type_module === 'majeur')
              .map(m => (
                <option key={m.id_module} value={m.id_module}>
                  {m.nommodule}
                  {form.modules[0].includes(m.id_module) ? ' ✓' : ''}
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
              if (!id) return;
              setForm({
                ...form,
                modules: [form.modules[0], updateArray(form.modules[1], id)],
              });
            }}
          >
            <option value="" disabled>
              {form.modules[1].length === 0
                ? 'Aucun sélectionné'
                : `${form.modules[1].length} sélectionné(s)`}
            </option>
            {moduleOptions
              .filter(m => m.type_module === 'mineur')
              .map(m => (
                <option key={m.id_module} value={m.id_module}>
                  {m.nommodule}
                  {form.modules[1].includes(m.id_module) ? ' ✓' : ''}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="modal-actions">
        <button type="submit">Proposer le cours</button>
        <button type="button" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
};

export default ProposeCourseForm;