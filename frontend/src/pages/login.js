import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas text-muted">
      Redirecting…
    </div>
  );
}
