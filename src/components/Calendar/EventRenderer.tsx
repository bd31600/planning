

import React from 'react';
import type { EventContentArg } from '@fullcalendar/core';
import type { EventMountArg } from '@fullcalendar/core';

interface EventRendererProps {
  arg: EventContentArg;
}

const EventRenderer: React.FC<EventRendererProps> & {
  handleDidMount: (info: EventMountArg) => void;
} = ({ arg }) => {
  const { event, timeText } = arg;
  const typecours = event.extendedProps.typecours as string;
  const rawModules = (event.extendedProps.modules as Array<{
    id_module: number;
    type_module: 'majeur' | 'mineur';
    nommodule: string;
  }>) || [];
  // Deduplicate modules by id and type
  const modules = Array.from(
    new Map(rawModules.map(m => [`${m.id_module}-${m.type_module}`, m])).values()
  );
  const intervenantsArr = (event.extendedProps.intervenants as string[]) || [];
  const sallesArr = (event.extendedProps.salles as string[]) || [];

  // Detailed view for day and week
  if (arg.view.type === 'timeGridDay' || arg.view.type === 'timeGridWeek') {
    return (
      <div className="fc-event-custom">
        <div className="fc-event-line1">{`${typecours} ${event.title}`}</div>
        {modules.length > 0 && (
          <div className="fc-event-line2">
            {modules
              .map(m =>
                `${m.type_module === 'majeur' ? 'Majeur' : 'Mineur'} : ${m.nommodule}`
              )
              .join(', ')}
          </div>
        )}
        <div className="fc-event-line3">{timeText}</div>
        <div className="fc-event-line4">
          {intervenantsArr.join(', ')}
          {sallesArr.length ? ` (${sallesArr.join(', ')})` : ''}
        </div>
      </div>
    );
  }

  // Compact view for month
  if (arg.view.type === 'dayGridMonth') {
    const dotColor =
      (event.backgroundColor as string) || (event.borderColor as string) || '#203f6a';
    return (
      <div className="fc-event-month">
        {dotColor && (
          <span
            className="fc-event-dot"
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
        {timeText} {typecours} {event.title}
      </div>
    );
  }

  return null;
};

// Adjust dot colors after mounting
EventRenderer.handleDidMount = (info) => {
  const dot = info.el.querySelector('.fc-event-dot, .fc-daygrid-event-dot') as HTMLElement | null;
  const color = info.event.backgroundColor as string | undefined;
  if (dot && color) {
    dot.style.backgroundColor = color;
    dot.style.borderColor = color;
  }
};

export default EventRenderer;