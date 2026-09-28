import { Navigate, useSearchParams } from 'react-router-dom';

/** Legacy URL — admin sign-in lives on `/`. */
export function AdminLoginPage() {
  const [params] = useSearchParams();
  const search = params.toString();
  return <Navigate to={search ? `/?${search}` : '/'} replace />;
};
