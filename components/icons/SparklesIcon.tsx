import React from 'react';

const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="m12 3-1.9 1.9-3.8.4.4 3.8L5 12l1.9 1.9.4 3.8 3.8.4 1.9 1.9 1.9-1.9 3.8-.4-.4-3.8L19 12l-1.9-1.9-.4-3.8-3.8-.4Z"/>
  </svg>
);

export default SparklesIcon;