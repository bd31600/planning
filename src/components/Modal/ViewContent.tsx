

import React from 'react';
import type { ReactNode } from 'react';

interface ViewContentProps {
  content: ReactNode;
}

const ViewContent: React.FC<ViewContentProps> = ({ content }) => {
  return <>{content}</>;
};

export default ViewContent;