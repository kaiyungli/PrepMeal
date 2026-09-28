import { FilterSectionConfig } from '@/components/filters';
import FilterGroupList from '@/components/filters/FilterGroupList';

interface HomeFilterGroupsProps {
  sections: FilterSectionConfig[];
}

/**
 * Renders the 8 filter groups as toggle chips, via the shared FilterGroupList
 * primitive also used by FilterCardShell (/recipes, /favorites, /generate).
 * Shared between the desktop inline panel and the mobile tray.
 */
export default function HomeFilterGroups({ sections }: HomeFilterGroupsProps) {
  return <FilterGroupList sections={sections} />;
}
