'use client';

/**
 * Home page navigation actions hook
 */

import { useRouter } from 'next/router';
import { useCallback } from 'react';

export function useHomePageActions() {
  const router = useRouter();

  // Navigate to generate page
  const handlePrimaryAction = useCallback(() => {
    router.push('/generate');
  }, [router]);

  return {
    handlePrimaryAction,
  };
}

export default useHomePageActions;
