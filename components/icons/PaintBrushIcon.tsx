import React from 'react';

const PaintBrushIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M14 19.9V16h3"/>
    <path d="M10 19.9V12h4"/>
    <path d="M4 19.9V8h4"/>
    <path d="M15 7.4a2.5 2.5 0 0 0-2.5-2.5c-1.4 0-2.5 1.1-2.5 2.5V12h5V7.4Z"/>
    <path d="M9 6.4a2.5 2.5 0 0 0-2.5-2.5C5.1 3.9 4 5 4 6.4V8h5V6.4Z"/>
    <path d="M2 21h20"/>
  </svg>
);

export default PaintBrushIcon;