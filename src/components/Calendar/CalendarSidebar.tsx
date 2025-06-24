import React from 'react';
import type FullCalendar from '@fullcalendar/react';
import type { EventApi } from '@fullcalendar/core';

interface CalendarSidebarProps {
  events: EventApi[];
  calendarRef: React.RefObject<FullCalendar | null>;
}

const CalendarSidebar: React.FC<CalendarSidebarProps> = ({ events, calendarRef }) => {
  const calApi = calendarRef.current?.getApi();
  let prevDateKey: string | null = null;

  return (
    <div>
      <h2 className="calendar__sidebar-title">Prochains événements</h2>
      <ul className="calendar__sidebar-list">
        {events.map(ev => {
          const start = ev.start;
          const curDateKey = start ? start.toDateString() : '';
          const showDate = curDateKey !== prevDateKey;
          if (showDate) prevDateKey = curDateKey;
          const dateLabel = showDate && start && calApi
            ? calApi.formatDate(start, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
            : '';
          const timeLabel = ev.allDay
            ? 'Jour entier'
            : start && calApi
              ? calApi.formatDate(start, { hour: '2-digit', minute: '2-digit' })
              : '';
          const dotColor = (ev.backgroundColor as string) || (ev.borderColor as string) || '#203f6a';

          return (
            <li
              key={ev.id}
              className="calendar__sidebar-item"
              style={{ borderTop: showDate ? undefined : 'none' }}
            >
              <div className="calendar__sidebar-date">
                {showDate ? dateLabel : ''}
              </div>
              <div className="calendar__sidebar-text">
                {dotColor && (
                  <span
                    style={{
                      backgroundColor: dotColor,
                      border: `1px solid ${dotColor}`,
                      width: '0.5em',
                      height: '0.5em',
                      borderRadius: '50%',
                      display: 'inline-block',
                      marginRight: '0.25em',
                      verticalAlign: 'middle',
                      flexShrink: 0,
                    }}
                  />
                )}
                {ev.extendedProps.typecours} {ev.title} {timeLabel}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CalendarSidebar;