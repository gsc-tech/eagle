import { login } from "@/firebase/authService";
import { useState } from "react";

interface LoginPageProps {
    onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await login(email, password);
            onLogin();
        } catch (error) {
            setError("Incorrect email or password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
            {/* Background dot grid */}
            <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                    backgroundImage:
                        "radial-gradient(circle, currentColor 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                }}
            />
            {/* Ambient glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-sm mx-4">
                {/* Login card */}
                <div className="bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/20 p-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="w-6 h-6 text-primary-foreground"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                                <path d="M13 13l6 6" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Project Eagle
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Sign in to your account
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label
                                htmlFor="email-input"
                                className="text-sm font-medium text-foreground"
                            >
                                Email
                            </label>
                            <input
                                id="email-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="user@gmail.com"
                                required
                                autoComplete="email"
                                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label
                                htmlFor="password-input"
                                className="text-sm font-medium text-foreground"
                            >
                                Password
                            </label>
                            <input
                                id="password-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2.5 text-sm text-destructive flex items-center gap-2">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="w-4 h-4 shrink-0"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            id="login-submit-btn"
                            type="submit"
                            disabled={loading}
                            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg
                                        className="animate-spin h-4 w-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v8H4z"
                                        />
                                    </svg>
                                    Signing in…
                                </span>
                            ) : (
                                "Sign in"
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    © {new Date().getFullYear()} Project Eagle. All rights reserved.
                </p>
            </div>
        </div>
    );
}
