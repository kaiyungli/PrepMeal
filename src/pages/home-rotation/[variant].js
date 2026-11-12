import Home from '@/pages/index';
export default Home;

export async function getStaticPaths() {
  const { HOME_EXAMPLE_COUNT } = await import('@/features/home/homeCalendar');
  return { paths: Array.from({ length: HOME_EXAMPLE_COUNT }, (_, variant) => ({ params: { variant: String(variant) } })), fallback: false };
}
export async function getStaticProps({ params }) {
  const { loadHomeContent } = await import('@/features/home/homeContent.server');
  const { HOME_ISR_SECONDS } = await import('@/features/home/homeRotation');
  return { props: await loadHomeContent(Number(params.variant)), revalidate: HOME_ISR_SECONDS };
}
