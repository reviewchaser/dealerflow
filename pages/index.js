import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <Head><title>DealerFlow</title></Head>
      <span className="loading loading-spinner loading-lg text-primary"></span>
    </div>
  );
}
