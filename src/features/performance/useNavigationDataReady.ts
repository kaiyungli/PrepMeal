import { useEffect } from 'react';
import { getNavigationMeasurement, navigationDataReady, type Page } from './navigationMeasurement';

export function useNavigationDataReady(page: Page, ready: boolean | (() => boolean), error = false) {
  useEffect(() => {
    if (!getNavigationMeasurement().running) return;
    if (typeof ready === 'function' ? ready() : ready) navigationDataReady(page, error ? 'error' : 'ready');
  }, [page, ready, error]);
}
