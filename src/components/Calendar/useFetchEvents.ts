import { useState, useCallback, useEffect } from 'react';
import type { EventInput } from '@fullcalendar/core';
import { getHolidayAndCelebrationEvents } from './Celebrations';
import { useAuth } from '../../AuthProvider';


const API_URL = import.meta.env.VITE_API_URL as string;
// Helper: deduplicate module entries (one per id_module+type_module)
function dedupModules(
  arr: { id_module: number; nommodule: string; type_module: 'majeur' | 'mineur' }[]
) {
  return Array.from(
    new Map(arr.map(o => [`${o.id_module}-${o.type_module}`, o])).values()
  );
}

type RawCours = {
  id_cours: number;
  matiere: string;
  typecours: string;
  debut_cours: string;
  fin_cours: string;
  description: string;
  parcours: 'Apprenti' | 'Intégré' | 'Tous';
  modules: { id_module: number; type_module: 'majeur' | 'mineur' }[];
};
type Effectuer = { id_salle: number; id_cours: number };
type Salle = { id_salle: number; batiment: string; numerosalle: string; capacite: number };
type ModuleColor = { id_color: number; id_module: number; color: string };
type Intervenir = { id_intervenant: number; id_module: number };

export function useFetchEvents(user: ReturnType<typeof useAuth>['user']) {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [intervenantOptions, setIntervenantOptions] = useState<
    { id_intervenant: number; nom: string; prenom: string }[]
  >([]);
  const [referentOptions, setReferentOptions] = useState<
    { id_intervenant: number; nom: string; prenom: string; mailreferent: string }[]
  >([]);
  const [moduleOptions, setModuleOptions] = useState<
    { id_module: number; nommodule: string; type_module: 'majeur' | 'mineur' }[]
  >([]);
  const [rawModuleOptions, setRawModuleOptions] = useState<
    { id_module: number; nommodule: string; type_module: 'majeur' | 'mineur' }[]
  >([]);
  const [formModuleOptions, setFormModuleOptions] = useState<
    { id_module: number; nommodule: string; type_module: 'majeur' | 'mineur' }[]
  >([]);
  const [salleOptions, setSalleOptions] = useState<Salle[]>([]);
  const [currentIntervenantId, setCurrentIntervenantId] = useState<number | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Timezone-Offset': String(new Date().getTimezoneOffset()),
    };

    // Role et ID intervenant courant
    const resRole = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'getRole' }),
    });
    const jsonRole = await resRole.json();
    const currentIntervenantId =
      jsonRole.success && (jsonRole.role === 'admin' || jsonRole.role === 'intervenant')
        ? jsonRole.id
        : null;
    setCurrentIntervenantId(currentIntervenantId);
    const userRole = jsonRole.success ? jsonRole.role : null;

    // Récupération des données nécessaires
    const [resCours, resEff, resSalles, resModuleNamesRes, resEnsRes, resIntRes, resColorsRes, resIntervRes] =
      await Promise.all([
        fetch(API_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'list', entity: 'Cours' }) }),
        fetch(API_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'list', entity: 'effectuer' }) }),
        fetch(API_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'list', entity: 'salles' }) }),
        fetch(API_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'list', entity: 'ModuleOptions' }) }),
        fetch(API_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'list', entity: 'enseigner' }) }),
        fetch(API_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'list', entity: 'intervenants' }) }),
        fetch(API_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'list', entity: 'module_couleurs' }) }),
        fetch(API_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'list', entity: 'intervenir' }) }),
      ]);
    const [jsonCours, jsonEff, jsonSalles, jsonModuleNames, jsonEns, jsonInt, jsonColors, jsonInterv] =
      await Promise.all([
        resCours.json(),
        resEff.json(),
        resSalles.json(),
        resModuleNamesRes.json(),
        resEnsRes.json(),
        resIntRes.json(),
        resColorsRes.json(),
        resIntervRes.json(),
      ]);

    if (!resCours.ok || !jsonCours.success) {
      console.error('Erreur chargement Cours', jsonCours);
      return;
    }

    // Traitement des données
    const rawCours: RawCours[] = jsonCours.data;
    const effectuerData: Effectuer[] = jsonEff.success ? jsonEff.data : [];
    const sallesData: Salle[] = jsonSalles.success ? jsonSalles.data : [];
    setSalleOptions(sallesData);
    const moduleNames: { id_module: number; nommodule: string; type_module: 'majeur' | 'mineur' }[] =
      jsonModuleNames.success ? jsonModuleNames.data : [];
    const enseignerData: { id_intervenant: number; id_cours: number }[] =
      jsonEns.success ? jsonEns.data : [];
    const intervenantsData: {
      id_intervenant: number;
      nom: string;
      prenom: string;
      referent: number;
      mailreferent: string;
    }[] = jsonInt.success ? jsonInt.data : [];
    const intervenirData: Intervenir[] = jsonInterv.success ? jsonInterv.data : [];

    setIntervenantOptions(intervenantsData);
    setReferentOptions(intervenantsData.filter(i => i.referent === 1));
    // Options brutes de modules (avant filtrage pour intervenant) + dé‑doublonnage
    const computedRaw = dedupModules(
      moduleNames.map(mn => ({
        id_module: mn.id_module,
        nommodule: mn.nommodule,
        type_module: mn.type_module,
      }))
    );
    setRawModuleOptions(computedRaw);
    // Copie pour filtrage éventuel
    let computedFiltered = [...computedRaw];
    // Ne filtrer QUE pour l’intervenant (l'admin conserve tous les modules)
    if (currentIntervenantId && userRole === 'intervenant') {
      const allowedIds = intervenirData
        .filter(rel => rel.id_intervenant === currentIntervenantId)
        .map(rel => rel.id_module);
      computedFiltered = computedFiltered.filter(opt => allowedIds.includes(opt.id_module));
    }
    setModuleOptions(dedupModules(computedFiltered));

    // Modules autorisés pour les formulaires (admin/intervenant)
    if (currentIntervenantId) {
      const allowedIdsForUser = intervenirData
        .filter(rel => rel.id_intervenant === currentIntervenantId)
        .map(rel => rel.id_module);
      setFormModuleOptions(
        dedupModules(
          computedFiltered.filter(m => allowedIdsForUser.includes(m.id_module))
        )
      );
    } else {
      setFormModuleOptions([]);
    }

    // Carte des couleurs
    const moduleColorMap = new Map<number, string>();
    if (resColorsRes.ok && jsonColors.success) {
      (jsonColors.data as ModuleColor[]).forEach(c => {
        moduleColorMap.set(c.id_module, c.color);
      });
    }

    // Événements fêtes et jours fériés
    const holidayEvents = await getHolidayAndCelebrationEvents();

    // Construction des événements FullCalendar
    const salleById = new Map(sallesData.map(s => [s.id_salle, s] as const));
    const moduleNameById = new Map(moduleNames.map(m => [m.id_module, m.nommodule] as const));
    const intervById = new Map(intervenantsData.map(i => [i.id_intervenant, i] as const));

    const evts: EventInput[] = rawCours.map(c => {
      const salles = effectuerData
        .filter(e => e.id_cours === c.id_cours)
        .map(e => salleById.get(e.id_salle))
        .filter(Boolean)
        .map(s => `${s!.batiment}${s!.numerosalle}`);
      const intervenants = enseignerData
        .filter(e => e.id_cours === c.id_cours && e.id_intervenant !== currentIntervenantId)
        .map(e => {
          const ii = intervById.get(e.id_intervenant);
          return ii ? `${ii.prenom} ${ii.nom}` : '';
        })
        .filter(Boolean);

      const intervenantIds = enseignerData
        .filter(e => e.id_cours === c.id_cours)
        .map(e => e.id_intervenant);
      const salleIds = effectuerData
        .filter(e => e.id_cours === c.id_cours)
        .map(e => e.id_salle);
      const modulesFull = c.modules.map(m => ({ ...m, nommodule: moduleNameById.get(m.id_module) || '?' }));
      const primaryModuleId = modulesFull[0]?.id_module;
      const eventColor = moduleColorMap.get(primaryModuleId!) || undefined;
      return {
        id: String(c.id_cours),
        title: c.matiere,
        start: c.debut_cours,
        end: c.fin_cours,
        backgroundColor: eventColor,
        borderColor: eventColor,
        textColor: '#fff',
        extendedProps: {
          typecours: c.typecours,
          description: c.description,
          parcours: c.parcours,
          modules: modulesFull,
          salles,
          intervenants,
          intervenantIds,
          salleIds,
        },
      };
    });

    evts.push(...holidayEvents);
    setEvents(evts);
  }, [user]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    refreshEvents: fetchEvents,
    intervenantOptions,
    moduleOptions,
    rawModuleOptions,
    formModuleOptions,
    salleOptions,
    referentOptions,
    currentIntervenantId,
  };
}
