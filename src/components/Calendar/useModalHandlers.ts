import { useState, useEffect } from 'react';
import type { RefObject } from 'react';
import type { EventApi, DatesSetArg, EventInput } from '@fullcalendar/core';
// Minimal handler argument types for FullCalendar
export interface DateClickArg {
  date: Date;
  jsEvent: MouseEvent;
}
export interface EventClickArg {
  event: EventApi;
  jsEvent: MouseEvent;
}

import type { ModalProps } from '../Modal/types';
import type FullCalendar from '@fullcalendar/react';

interface UseModalHandlersParams {
  role?: 'admin' | 'intervenant' | 'eleve';
  calendarRef: RefObject<FullCalendar | null>;
  events: EventInput[];
  refreshEvents: () => Promise<void>;
  intervenantOptions: { id_intervenant: number; nom: string; prenom: string }[];
  moduleOptions: { id_module: number; nommodule: string; type_module: 'majeur' | 'mineur' }[];
  referentOptions: { id_intervenant: number; nom: string; prenom: string; mailreferent: string }[];
  salleOptions: { id_salle: number; batiment: string; numerosalle: string; capacite: number }[];
}

interface UseModalHandlersResult {
  sidebarEvents: EventApi[];
  modalAddProps?: ModalProps;
  modalEditProps?: ModalProps;
  modalProposeProps?: ModalProps;
  handleDateClick: (info: DateClickArg) => void;
  handleEventClick: (info: EventClickArg) => void;
  handleDatesSet: (info: DatesSetArg) => void;
  handleProposeClick: () => void;
}

export function useModalHandlers({
  role,
  calendarRef,
  events,
  refreshEvents,
  intervenantOptions,
  moduleOptions,
  referentOptions,
  salleOptions,
}: UseModalHandlersParams): UseModalHandlersResult {
  const [sidebarEvents, setSidebarEvents] = useState<EventApi[]>([]);
  const [modalAddProps, setModalAddProps] = useState<ModalProps | undefined>();
  const [modalEditProps, setModalEditProps] = useState<ModalProps | undefined>();
  const [modalProposeProps, setModalProposeProps] = useState<ModalProps | undefined>();

  const updateAddPos = (x: number, y: number) => {
    setModalAddProps(prev => prev ? { ...prev, x, y } : prev);
  };
  const updateEditPos = (x: number, y: number) => {
    setModalEditProps(prev => prev ? { ...prev, x, y } : prev);
  };
  const updateProposePos = (x: number, y: number) => {
    setModalProposeProps(prev => (prev ? { ...prev, x, y } : prev));
  };

  // Compute next upcoming events whenever fullcalendar is updated
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const evs = api.getEvents();
    const upcoming = evs
      .filter(ev => ev.start && ev.start >= new Date())
      .sort((a, b) => a.start!.getTime() - b.start!.getTime());
    setSidebarEvents(upcoming);
  }, [events, calendarRef]);

  const handleDateClick = (info: DateClickArg) => {
    if (role === 'eleve') return;

    const dt = info.date;
    const startISO = dt.toISOString().slice(0, 16);
    const endISO = new Date(dt.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);

    // ADMIN → ouvre / met à jour le modal "addCourse"
    if (role === 'admin') {
      // Ferme les autres
      setModalEditProps(undefined);
      setModalProposeProps(undefined);
      setModalAddProps(prev =>
        prev
          ? {
              ...prev,
              type: {
                ...prev.type,
                initialStart: startISO,
                initialEnd: endISO,
              },
            }
          : {
              isOpen: true,
              onClose: () => setModalAddProps(undefined),
              title: 'Ajouter un cours',
              x: modalAddProps?.x ?? info.jsEvent.clientX,
              y: modalAddProps?.y ?? info.jsEvent.clientY,
              onDragEnd: updateAddPos,
              type: {
                kind: 'addCourse',
                intervenantOptions,
                moduleOptions,
                salleOptions,
                initialStart: startISO,
                initialEnd: endISO,
                onSubmit: async () => {
                  await refreshEvents();
                  setModalAddProps(undefined);
                },
              },
            },
      );
      return;
    }

    // INTERVENANT → ouvre / met à jour le modal "proposeCourse"
    if (role === 'intervenant') {
      // Ferme add / edit
      setModalAddProps(undefined);
      setModalEditProps(undefined);
      setModalProposeProps(prev =>
        prev
          ? {
              ...prev,
              type: {
                ...prev.type,
                initialStart: startISO,
                initialEnd: endISO,
              },
            }
          : {
              isOpen: true,
              onClose: () => setModalProposeProps(undefined),
              title: 'Proposer un cours',
              x: modalProposeProps?.x ?? info.jsEvent.clientX,
              y: modalProposeProps?.y ?? info.jsEvent.clientY,
              onDragEnd: updateProposePos,
              type: {
                kind: 'proposeCourse',
                referentOptions,
                moduleOptions,
                salleOptions,
                initialStart: startISO,
                initialEnd: endISO,
                onPropose: async () => {
                  await refreshEvents();
                  setModalProposeProps(undefined);
                },
              },
            },
      );
    }
  };

  const handleEventClick = (info: EventClickArg) => {
    if (role !== 'admin') return;
    // Vérification de droit : n'autorise l'édition que si le cours contient un module autorisé
    const allowedModuleIds = moduleOptions.map(m => m.id_module);
    const eventModuleIds = ((info.event.extendedProps.modules as { id_module: number }[]) || [])
      .map(m => m.id_module);
    if (!eventModuleIds.some(id => allowedModuleIds.includes(id))) return;
    // Close add modal if open
    setModalAddProps(undefined);
    const ev = info.event;
    const startISO = ev.start?.toISOString().slice(0, 16) ?? '';
    const endISO = ev.end?.toISOString().slice(0, 16) ?? '';
    // extract extendedProps (may be undefined)
    const ext = ev.extendedProps as {
      description?: string;
      parcours?: 'Apprenti' | 'Intégré' | 'Tous';
      // raw id arrays added by useFetchEvents
      intervenantIds?: number[];
      salleIds?: number[];
      modules?: number[];       // already ids
    };
    const description = ext.description || '';
    const parcours = ext.parcours || 'Tous';
    const intervenants = ext.intervenantIds || [];
    const modules = ext.modules || [];
    const salles = ext.salleIds || [];

    setModalEditProps(prev => {
      // if already in edit mode, update all course fields to the clicked event
      if (prev && prev.type.kind === 'editCourse') {
        return {
          ...prev,
          type: {
            ...prev.type,
            salleOptions, 
            course: {
              id_cours: Number(ev.id),
              typecours: ev.extendedProps.typecours as string,
              matiere: ev.title,
              debut_cours: startISO,
              fin_cours: endISO,
              description,
              parcours,
              intervenants,
              modules,
              salles,
            },
            initialStart: startISO,
            initialEnd: endISO,
          },
        };
      }
      // otherwise open new edi‡t modal
      return {
        isOpen: true,
        onClose: () => setModalEditProps(undefined),
        title: 'Modifier un cours',
        x: modalAddProps?.x ?? info.jsEvent.clientX,
        y: modalAddProps?.y ?? info.jsEvent.clientY,
        onDragEnd: updateEditPos,
        type: {
          kind: 'editCourse',
          intervenantOptions,
          moduleOptions,
          salleOptions,
          course: {
            id_cours: Number(ev.id),
            typecours: ev.extendedProps.typecours as string,
            matiere: ev.title,
            debut_cours: startISO,
            fin_cours: endISO,
            description,
            parcours,
            intervenants,
            modules,
            salles,
          },
          initialStart: startISO,
          initialEnd: endISO,
          onUpdate: async () => {
            await refreshEvents();
            setModalEditProps(undefined);
          },
          onDelete: async () => {
            await refreshEvents();
            setModalEditProps(undefined);
          },
        },
      };
    });
  };

  const handleProposeClick = () => {
    if (role !== 'intervenant') return;
    // close other modals
    setModalAddProps(undefined);
    setModalEditProps(undefined);
    const now = new Date();
    const startISO = now.toISOString().slice(0,16);
    const endISO   = new Date(now.getTime()+60*60*1000).toISOString().slice(0,16);

    setModalProposeProps({
      isOpen: true,
      onClose: () => setModalProposeProps(undefined),
      title: 'Proposer un cours',
      x: window.innerWidth/2 - 250,
      y: 100,
      onDragEnd: (x:number,y:number)=> setModalProposeProps(p=> p?{...p,x,y}:p),
      type: {
        kind: 'proposeCourse',
        referentOptions,
        moduleOptions,
        salleOptions,
        initialStart: startISO,
        initialEnd: endISO,
        onPropose: async () => {
          // simply close + maybe refresh
          await refreshEvents();
          setModalProposeProps(undefined);
        }
      }
    });
  };

  const handleDatesSet = () => {
    // no-op (toolbar reads directly from calendar API)
  };

  return {
    sidebarEvents,
    modalAddProps,
    modalEditProps,
    modalProposeProps,
    handleDateClick,
    handleEventClick,
    handleDatesSet,
    handleProposeClick,
  };
}