import { LoginForm } from "./login-form";
import { version } from "../../../package.json";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            Cadence
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Governance, risk and corporate planning for local government
          </p>
        </div>
        <LoginForm />
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Version {version}
        </p>
      </div>
    </main>
  );
}
