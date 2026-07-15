import VerificationDetail from '../../components/VerificationDetail';
 
export default async function VerificationDetailPage({ params }) {
  const { id } = await params;
  return <VerificationDetail id={id} />;
}
 