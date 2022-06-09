import {App, inject} from 'vue';

const key = Symbol('plugin-modal-confirm');

export class ConfirmDialog {
  private _confirmHandler?: (action: string) => Promise<boolean>;

  set confirmHandler(handler: (action: string) => Promise<boolean>) {
    if (this._confirmHandler) {
      throw new Error('confirmHandler already set');
    }
    this._confirmHandler = handler;
  }

  async confirm(action: string) {
    if (!this._confirmHandler) {
      throw new Error('confirmHandler not set');
    }
    return await this._confirmHandler(action);
  }
}

export default {
  install: (app: App, dlg: ConfirmDialog): void => {
    app.provide(key, dlg);
  },
};

export function useConfirmDialog(): ConfirmDialog {
  const dlg: ConfirmDialog | undefined = inject(key);
  if (!dlg) throw new Error('ConfirmDialog not set');
  return dlg;
}
