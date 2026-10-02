import type { ComponentProps } from 'react';
/** Native range input supplies keyboard, pointer capture and touch scrubbing. */
export function PlayerProgress(props: ComponentProps<'input'>) { return <input {...props} type="range" />; }
