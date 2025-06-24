// src/components/Celebrations.ts

import type { EventInput } from '@fullcalendar/core';

function getNthSunday(year: number, month: number, n: number): string {
  const date = new Date(Date.UTC(year, month, 1));
  let count = 0;
  while (date.getUTCMonth() === month) {
    if (date.getUTCDay() === 0) {
      count++;
      if (count === n) break;
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}

export async function getHolidayAndCelebrationEvents(): Promise<EventInput[]> {
  const events: EventInput[] = [];
  const year = new Date().getFullYear();

  // 1) Jours fériés
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/FR`);
    if (res.ok) {
      const holidays: Array<{ date: string; localName: string }> = await res.json();
      holidays.forEach(h => {
        events.push({
          id: `hol-${h.date}`,
          title: h.localName,
          start: h.date,
          allDay: true,
          display: 'block',
          backgroundColor: 'green',
          borderColor: 'green',
          textColor: '#fff',
          classNames: ['holiday-event'],
          extendedProps: {
            typecours: '',
            modules: [],
            intervenants: [],
            salles: []
          }
        });
      });
    }
  } catch (err) {
    console.warn('Failed to fetch public holidays:', err);
  }

  // 2) Fête des Mères (2ᵉ dimanche de mai)
  const motherDay = getNthSunday(year, 4, 2);
  events.push({
    id: `fete-meres-${motherDay}`,
    title: "Fête des Mères",
    start: motherDay,
    allDay: true,
    display: 'block',
    backgroundColor: 'green',
    borderColor: 'green',
    textColor: '#fff',
    classNames: ['holiday-event'],
    extendedProps: {
      typecours: '',
      modules: [],
      intervenants: [],
      salles: []
    }
  });

  // 3) Fête des Pères (3ᵉ dimanche de juin)
  const fatherDay = getNthSunday(year, 5, 3);
  events.push({
    id: `fete-peres-${fatherDay}`,
    title: "Fête des Pères",
    start: fatherDay,
    allDay: true,
    display: 'block',
    backgroundColor: 'green',
    borderColor: 'green',
    textColor: '#fff',
    classNames: ['holiday-event'],
    extendedProps: {
      typecours: '',
      modules: [],
      intervenants: [],
      salles: []
    }
  });

  return events;
}