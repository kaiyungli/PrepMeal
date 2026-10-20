import type { ReactNode } from 'react';
import { editorialRecipeHref } from '@/constants/editorialRecipeLinks';

export default function EditorialRecipeLink({ slug, children, className, unavailableLabel }: {
  slug: string; children: ReactNode; className?: string; unavailableLabel?: string;
}) {
  const href = editorialRecipeHref(slug);
  if (href) return <a href={href} className={className}>{children}</a>;
  return <span className={className}>
    {unavailableLabel || <>{children}<span className="block mt-1 text-sm text-[#AA7A50]">食譜暫未提供</span></>}
  </span>;
}
