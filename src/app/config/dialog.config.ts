import type { MatDialogConfig } from '@angular/material/dialog';

type DialogSizeConfig = Pick<MatDialogConfig, 'width' | 'maxWidth' | 'maxHeight'>;

export const APP_DIALOG_SIZE = {
  compact: {
    width: '500px',
    maxWidth: 'calc(100vw - 24px)',
  },
  action: {
    width: '560px',
    maxWidth: 'calc(100vw - 24px)',
  },
  cartPreview: {
    width: '300px',
  },
  profile: {
    width: '760px',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: '90vh',
  },
  userForm: {
    width: '820px',
    maxWidth: 'calc(100vw - 48px)',
    maxHeight: '78vh',
  },
  addToCart: {
    width: '860px',
    maxWidth: 'calc(100vw - 48px)',
    maxHeight: '78vh',
  },
  cart: {
    width: '900px',
    maxWidth: 'calc(100vw - 48px)',
    maxHeight: '78vh',
  },
  reward: {
    width: '920px',
    maxWidth: 'calc(100vw - 48px)',
    maxHeight: '78vh',
  },
  product: {
    width: '940px',
    maxWidth: 'calc(100vw - 48px)',
  },
} as const satisfies Record<string, DialogSizeConfig>;
