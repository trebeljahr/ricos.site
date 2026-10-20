import clsx from "clsx";
import { type FormEvent, useId, useRef, useState } from "react";
import { offeredListKeys } from "src/lib/newsletter/lists";
import { FancyButton, LoadingDots } from "./FancyUI";

/** Rico's words for the announce list. Keep them exactly as they are. */
export const ANNOUNCE_LINE =
  "I make a new thing every month or two. Want one email when the next one is out? Nothing else.";

/**
 * The one-line signup for the announce list: the sentence above and one
 * email field, for the end of a page. It shows only when this deployment
 * offers the list (LISTMONK_ANNOUNCE_LIST_ID is set). Other Rico sites post
 * the same form to https://ricos.site/api/announce-signup, see
 * docs/announce-signup.md.
 */
export function AnnounceSignup({ className }: { className?: string }) {
  if (!offeredListKeys().includes("announce")) return null;
  return <AnnounceSignupForm className={className} />;
}

function AnnounceSignupForm({ className }: { className?: string }) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = inputRef.current;
    if (input && !input.checkValidity()) {
      setError(
        input.validity.valueMissing
          ? "Enter your email address first."
          : "That email address looks incomplete. Check it for typos.",
      );
      input.focus();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/announce-signup", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ email, website: honeypotRef.current?.value ?? "" }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        success?: string;
        errorMessage?: string;
      };
      if (!response.ok || !data.success) {
        setError(data.errorMessage ?? "Something went wrong while signing up. Try again?");
      } else {
        setSuccess(data.success);
      }
    } catch {
      setError("Something went wrong while signing up. Try again?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={clsx("not-prose max-w-prose", className)}>
      {success ? (
        <p role="status">
          {success} The link goes to <span className="font-medium">{email}</span>.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-label">
          <label htmlFor={`${id}-email`}>{ANNOUNCE_LINE}</label>
          {/* Honeypot: hidden from people and screen readers, filled by bots. */}
          <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
              ref={honeypotRef}
            />
          </div>
          <div className="flex flex-col gap-tight sm:flex-row sm:items-center">
            <input
              id={`${id}-email`}
              ref={inputRef}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              className={clsx(
                "w-full sm:max-w-xs px-3 py-2 rounded-md bg-slate-100 dark:bg-gray-900 dark:text-white focus:outline-none",
                error
                  ? "ring-2 ring-rose-400/70 dark:ring-rose-500/60"
                  : "focus:ring-2 focus:ring-teal-400/60 dark:focus:ring-teal-500/50",
              )}
            />
            <FancyButton type="submit" disabled={loading} loading={loading} className="sm:w-36">
              {loading ? <LoadingDots label="Subscribing" /> : "Subscribe"}
            </FancyButton>
          </div>
          {error && (
            <p id={`${id}-error`} role="alert" className="text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
