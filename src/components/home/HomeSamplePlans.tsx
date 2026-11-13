import { useLayoutEffect } from 'react';
import '@/features/home/featuredBootstrap';
import { homeSelectionScript } from '@/features/home/homeHero';
import type { HomeSampleCandidate } from '@/features/home/homeSamples';
import HomeSamplePlan from './HomeSamplePlan';

/** Whole precomputed menus, including quantities, remain readable without JS. */
export default function HomeSamplePlans({ candidates, bootstrap }: { candidates: HomeSampleCandidate[]; bootstrap?: string }) {
  const ids = candidates.map(candidate => candidate.id);
  const signature = JSON.stringify(ids);
  useLayoutEffect(() => {
    window.__prepmealHomeFeatured?.mount(JSON.parse(signature), false, 'sample');
  }, [signature]);
  const boot = homeSelectionScript(bootstrap, ids, 'sample');
  return <>
    {boot && <script dangerouslySetInnerHTML={{ __html: boot }} />}
    <div id="home-sample-list">
      {candidates.map(candidate => <div key={candidate.id} className="pm-sample-item" data-sample-id={candidate.id}>
        <HomeSamplePlan plan={candidate.plan} headingId={`home-sample-${candidate.id}`} />
      </div>)}
    </div>
  </>;
}
