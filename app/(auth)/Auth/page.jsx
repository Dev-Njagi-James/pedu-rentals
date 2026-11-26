import { Suspense } from "react";
import AuthContent from "./AuthContent";

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthContent />
    </Suspense>
  );
}
