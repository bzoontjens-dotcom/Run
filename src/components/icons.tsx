import type { ReactNode, SVGProps } from 'react';

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const SearchIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const LocateIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    <circle cx="12" cy="12" r="7" />
  </Icon>
);

export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const UndoIcon = (p: P) => (
  <Icon {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </Icon>
);

export const TrashIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icon>
);

export const ShuffleIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 7h3.5c2 0 3.5 1 4.5 2.6l2 2.8c1 1.6 2.5 2.6 4.5 2.600H21" />
    <path d="M3 17h3.5c1.3 0 2.4-.4 3.3-1.200M21 7h-3.500c-1.3 0-2.4.4-3.3 1.2" />
    <path d="m18 4 3 3-3 3M18 14l3 3-3 3" />
  </Icon>
);

export const MapIcon = (p: P) => (
  <Icon {...p}>
    <path d="m9 4-6 2.500v13.500l6-2.5 6 2.5 6-2.500V4l-6 2.500L9 4Z" />
    <path d="M9 4v13.500M15 6.500V20" />
  </Icon>
);

export const CalendarIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);

export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.500L19 7.5" />
  </Icon>
);

export const ChevronLeftIcon = (p: P) => (
  <Icon {...p}>
    <path d="m15 5-7 7 7 7" />
  </Icon>
);

export const ShareIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 15V3M8 7l4-4 4 4" />
    <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
  </Icon>
);

export const PencilIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 20h4L19.5 8.500a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" />
    <path d="m14.5 7.5 3 3" />
  </Icon>
);

export const LoopIcon = (p: P) => (
  <Icon {...p}>
    <path d="M17 3.5 20.5 7 17 10.5" />
    <path d="M20.5 7H9a5.5 5.5 0 0 0-5.5 5.500v0A5.5 5.5 0 0 0 9 18h6" />
  </Icon>
);

export const PlusIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
