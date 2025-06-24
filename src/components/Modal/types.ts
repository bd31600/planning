import type { ReactNode } from 'react';

export interface Course {
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
}

export type ModalType =
  | { kind: 'view'; content: ReactNode }
  | {
      kind: 'addCourse';
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
      }) => void;
    }
  | {
      kind: 'proposeCourse';
      /** Référents (intervenants ayant droit admin) que l’intervenant peut notifier */
      referentOptions: {
        id_intervenant: number;
        nom: string;
        prenom: string;
        mailreferent: string;
      }[];
      /** Modules disponibles (même shape que pour addCourse) */
      moduleOptions: {
        id_module: number;
        nommodule: string;
        type_module: 'majeur' | 'mineur';
      }[];
      /** Salles éventuellement proposées (facultatif) */
      salleOptions?: {
        id_salle: number;
        batiment: string;
        numerosalle: string;
        capacite: number;
      }[];
      /** Pré‑remplissage éventuel si l’intervenant a cliqué sur un créneau */
      initialStart?: string;
      initialEnd?: string;
      /** Callback après l’envoi du mail de proposition */
      onPropose: (data: {
        typecours: string;
        matiere: string;
        debut_cours: string;
        fin_cours: string;
        description: string;
        parcours: Array<'Apprenti' | 'Intégré' | 'Tous'>;
        referents: number[]; // ids des référents destinataires
        modules: number[];
        salles?: number[];
      }) => void;
    }
  | {
      kind: 'editCourse';
      intervenantOptions: { id_intervenant: number; nom: string; prenom: string }[];
      moduleOptions: { id_module: number; nommodule: string; type_module: 'majeur' | 'mineur' }[];
      salleOptions: { id_salle: number; batiment: string; numerosalle: string; capacite: number }[];
      course: Course;
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
      }) => void;
      onDelete: (id: number) => void;
    };

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  type: ModalType;
  x: number;
  y: number;
  /**
   * Called after the user stops dragging the modal so that the caller can
   * persist the last position (x, y).
   */
  onDragEnd?: (x: number, y: number) => void;
}

export interface ProposeCourseFormProps {
  referentOptions: {
    id_intervenant: number;
    nom: string;
    prenom: string;
    mailreferent: string;
  }[];
  moduleOptions: {
    id_module: number;
    nommodule: string;
    type_module: 'majeur' | 'mineur';
  }[];
  salleOptions?: {
    id_salle: number;
    batiment: string;
    numerosalle: string;
    capacite: number;
  }[];
  initialStart?: string;
  initialEnd?: string;
  onCancel: () => void;
  onPropose: (data: {
    typecours: string;
    matiere: string;
    debut_cours: string;
    fin_cours: string;
    description: string;
    parcours: Array<'Apprenti' | 'Intégré' | 'Tous'>;
    referents: number[];
    modules: number[];
    salles?: number[];
  }) => void;
}
