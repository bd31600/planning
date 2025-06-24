import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import ReactDOM from 'react-dom';
import type { ModalProps } from './types';
import ViewContent from './ViewContent';
import AddCourseForm from './AddCourseForm';
import EditCourseForm from './EditCourseForm';
import ProposeCourseForm from './ProposeCourseForm';
import './Modal.css';

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, type, x, y, onDragEnd }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!modalRef.current) return;
    const rect = modalRef.current.getBoundingClientRect();
    dragRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !dragRef.current) return;
    let newX = e.clientX - dragRef.current.offsetX;
    let newY = e.clientY - dragRef.current.offsetY;
    const topBarHeight = 60;
    if (modalRef.current) {
      const { offsetWidth: mw, offsetHeight: mh } = modalRef.current;
      const maxX = window.innerWidth - mw;
      const maxY = window.innerHeight - mh;
      newX = Math.min(Math.max(0, newX), maxX);
      newY = Math.min(Math.max(topBarHeight, newY), maxY);
    }
    setPos({ x: newX, y: newY });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    // Notify parent of final position
    if (onDragEnd) {
      onDragEnd(pos.x, pos.y);
    }
    dragRef.current = null;
  }, [onDragEnd, pos.x, pos.y]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Ensure modal stays fully onscreen when opened
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const { offsetWidth: mw, offsetHeight: mh } = modalRef.current;
      const topBarHeight = 60;
      let newX = pos.x;
      let newY = pos.y;
      const maxX = window.innerWidth - mw;
      const maxY = window.innerHeight - mh;
      newX = Math.min(Math.max(0, newX), maxX);
      newY = Math.min(Math.max(topBarHeight, newY), maxY);
      if (newX !== pos.x || newY !== pos.y) {
        setPos({ x: newX, y: newY });
      }
    }
  }, [isOpen, pos.x, pos.y]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-container">
      <div ref={modalRef} className="modal" style={{ top: pos.y, left: pos.x }}>
        <div className="modal-header" onMouseDown={handleMouseDown}>
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {type.kind === 'view' && <ViewContent content={type.content} />}
          {type.kind === 'addCourse' && (
            <AddCourseForm
              key={type.initialStart + '_' + type.initialEnd}
              intervenantOptions={type.intervenantOptions}
              moduleOptions={type.moduleOptions}
              salleOptions={type.salleOptions}
              initialStart={type.initialStart}
              initialEnd={type.initialEnd}
              onSubmit={async data => {
                await type.onSubmit(data);
                onClose();
              }}
              onCancel={onClose}
            />
          )}
          {type.kind === 'editCourse' && (
            <EditCourseForm
              key={type.course.id_cours + '_' + type.initialStart + '_' + type.initialEnd}
              intervenantOptions={type.intervenantOptions}
              moduleOptions={type.moduleOptions}
              salleOptions={type.salleOptions}
              course={type.course}
              initialStart={type.initialStart}
              initialEnd={type.initialEnd}
              onUpdate={async data => {
                await type.onUpdate(data);
                onClose();
              }}
              onDelete={async id => {
                await type.onDelete(id);
                onClose();
              }}
              onCancel={onClose}
            />
          )}
          {type.kind === 'proposeCourse' && (
            <ProposeCourseForm
              key={(type.initialStart ?? '') + '_' + (type.initialEnd ?? '')}
              referentOptions={type.referentOptions}
              moduleOptions={type.moduleOptions}
              salleOptions={type.salleOptions}
              initialStart={type.initialStart}
              initialEnd={type.initialEnd}
              onPropose={async data => {
                await type.onPropose(data);
                onClose();
              }}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default memo(Modal);