import { describe, expect, it } from 'vitest';
import { shouldReportErrors } from '@/lib/errorMonitoring';

describe('error monitoring switch', () => {
  it('reports only in production with a DSN', () => {
    expect(shouldReportErrors(undefined, 'production')).toBe(false);
    expect(shouldReportErrors('https://k@o.ingest.sentry.io/1', 'preview')).toBe(false);
    expect(shouldReportErrors('https://k@o.ingest.sentry.io/1', 'production')).toBe(true);
  });
});
