import { useState } from "react";

interface LoginFormProps {
  disabled: boolean;
  error: string | null;
  onLogin: (username: string, password: string) => void;
}

/**
 * Sign-in form. Exchanges username/password for a JWT via POST /auth.
 * Prefilled with the dev demo login for a one-click prototype sign-in.
 */
export function LoginForm({ disabled, error, onLogin }: LoginFormProps) {
  const [username, setUsername] = useState(
    import.meta.env.VITE_DEMO_USERNAME ?? "player@example.com",
  );
  const [password, setPassword] = useState(import.meta.env.VITE_DEMO_PASSWORD ?? "");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (username.trim() && password) {
      onLogin(username.trim(), password);
    }
  }

  return (
    <form className="card login" onSubmit={handleSubmit} aria-labelledby="login-heading">
      <h2 id="login-heading">Sign in</h2>
      <label className="field">
        <span>Username</span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder="player@example.com"
          required
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </label>
      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--primary" disabled={disabled}>
        {disabled ? "Signing in…" : "Sign in"}
      </button>
      <p className="muted login__hint">
        Dev demo login: <code>player@example.com</code> / <code>demo-password</code>.
      </p>
    </form>
  );
}

