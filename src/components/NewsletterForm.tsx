import { SaplingEgg } from "@components/EasterEggs/Sapling";
import clsx from "clsx";
import Link from "next/link";
import { type ChangeEvent, type FormEvent, type ReactNode, useId, useRef, useState } from "react";
import ConfettiExplosion, { type ConfettiProps } from "react-confetti-explosion";
import {
  DEFAULT_LIST,
  type ListKey,
  NEWSLETTER_LISTS,
  offeredListKeys,
} from "src/lib/newsletter/lists";
import { FancyButton, LoadingDots } from "./FancyUI";

async function fetchData(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  if (!response.ok || response.status !== 200) {
    const err = new Error("HTTP status code: " + response.status + response);
    throw err;
  }
  return await response.json();
}

const mediumConfettiProps: ConfettiProps = {
  force: 0.6,
  duration: 3000,
  particleCount: 200,
  width: 1000,
  zIndex: 400,
};

/**
 * Signup form for one of the lists in src/lib/newsletter/lists.ts, Live
 * and Learn by default. Any other list also offers Live and Learn as an
 * unticked checkbox. A list this deployment does not offer yet (no list id
 * configured) falls back to the plain Live and Learn form.
 */
export const NewsletterForm = ({
  list: requestedList = DEFAULT_LIST,
  link,
  heading,
  text,
}: {
  list?: ListKey;
  link?: ReactNode;
  heading?: ReactNode;
  text?: ReactNode;
}) => {
  const list = offeredListKeys().includes(requestedList) ? requestedList : DEFAULT_LIST;
  const isDefaultList = list === DEFAULT_LIST;
  const [ownList, setOwnList] = useState(true);
  const [alsoDefault, setAlsoDefault] = useState(false);
  const [email, setEmail] = useState("");
  // Unique per form: /newsletter shows one form per list.
  const errorId = `${useId()}-email-error`;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; invalidEmail: boolean } | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const input = emailInputRef.current;
    if (input && !input.checkValidity()) {
      setError({
        message: input.validity.valueMissing
          ? "Enter your email address to subscribe."
          : "That email address looks incomplete. Check it for typos.",
        invalidEmail: true,
      });
      input.focus();
      return;
    }

    const lists: ListKey[] = isDefaultList
      ? [DEFAULT_LIST]
      : [...(ownList ? [list] : []), ...(alsoDefault ? [DEFAULT_LIST] : [])];
    if (lists.length === 0) {
      setError({ message: "Tick at least one of the lists to subscribe.", invalidEmail: false });
      return;
    }

    setLoading(true);
    setError(null);
    const headers = new Headers();

    headers.append("Accept", "application/json, text/plain, */*");
    headers.append("Content-Type", "application/json");

    try {
      const data = await fetchData("/api/signup", {
        method: "POST",
        body: JSON.stringify({
          email,
          website: honeypotRef.current?.value ?? "",
          // The default form posts what it always has; no `lists` means Live and Learn.
          ...(isDefaultList ? {} : { lists }),
        }),
        headers: headers,
      });

      setSuccess(data.success);
      setLoading(false);
    } catch (_err) {
      setError({
        message: "Something went wrong while signing up... maybe, try again?",
        invalidEmail: false,
      });
      setLoading(false);
    }
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    if (error?.invalidEmail) setError(null);
  };

  const listInfo = NEWSLETTER_LISTS[list];

  const defaultLink = isDefaultList ? (
    <Link as="/newsletters" href="/newsletters" className="mt-stack block w-fit">
      Check out what you missed so far.
    </Link>
  ) : null;

  const defaultText = isDefaultList ? (
    <>
      <p className="mb-para">
        Join the Live and Learn Newsletter to receive digital postcards filled with beauty, travel
        stories and links to nice things I have found, once or twice a month. No spam, ever. You can
        unsubscribe at any time.
      </p>
    </>
  ) : (
    <p className="mb-para">
      {listInfo.promise} {listInfo.cadence} You can unsubscribe at any time.
    </p>
  );

  const defaultHeading = isDefaultList ? (
    <h2 className="relative flush-top">
      Subscribe to Live and Learn <SaplingEgg />
    </h2>
  ) : (
    <h2 className="flush-top">Get {listInfo.name}</h2>
  );

  const checkboxClass =
    "size-4 shrink-0 cursor-pointer accent-teal-500 dark:accent-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60";

  return (
    <div className="mx-auto w-full max-w-prose">
      {success ? (
        <div className="relative overflow-hidden px-5 py-10 rounded-lg bg-white dark:bg-gray-800 border-4 border-gray-200 dark:border-gray-700">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-green-400 via-teal-400 to-blue-600"
          />
          <div className="flex w-full justify-center">
            <ConfettiExplosion {...mediumConfettiProps} />
          </div>
          <div className="flow-stack animate-rise-in motion-reduce:animate-none">
            <span className="flex size-12 items-center justify-center rounded-full bg-linear-to-br from-green-400 to-blue-600 text-white shadow-lg shadow-teal-500/20">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none">
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  strokeDasharray={1}
                  className="animate-draw-check motion-reduce:animate-none"
                />
              </svg>
            </span>
            <h2>Almost there!</h2>
            <p>
              We sent a confirmation link to{" "}
              <span className="font-medium text-gray-900 dark:text-white">{email}</span>. Click it
              to complete your signup. If you don&apos;t see it, check your spam folder.
            </p>

            {!link && defaultLink}

            <button
              type="button"
              className="text-left text-sm text-gray-500 dark:text-gray-400 underline decoration-gray-300 dark:decoration-gray-600 underline-offset-4 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer transition-colors"
              onClick={() => setSuccess(null)}
            >
              Sign up with a different email
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5 py-10 rounded-lg bg-white dark:bg-gray-800 border-4 border-gray-200 dark:border-gray-700">
          {heading || defaultHeading}
          {text || defaultText}

          <form className="form flex flex-col justify-center" onSubmit={handleSubmit} noValidate>
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
            {!isDefaultList && (
              <fieldset className="not-prose mb-stack flex flex-col gap-tight">
                <legend className="sr-only">Lists to subscribe to</legend>
                <label className="flex items-center gap-tight cursor-pointer">
                  <input
                    type="checkbox"
                    name="lists"
                    value={list}
                    checked={ownList}
                    onChange={(event) => setOwnList(event.target.checked)}
                    className={checkboxClass}
                  />
                  {listInfo.name}
                </label>
                <label className="flex items-center gap-tight cursor-pointer">
                  <input
                    type="checkbox"
                    name="lists"
                    value={DEFAULT_LIST}
                    checked={alsoDefault}
                    onChange={(event) => setAlsoDefault(event.target.checked)}
                    className={checkboxClass}
                  />
                  Also get {NEWSLETTER_LISTS[DEFAULT_LIST].name}
                </label>
              </fieldset>
            )}
            <div className="flex flex-col gap-stack sm:flex-row sm:items-center">
              <input
                name="email"
                type="email"
                aria-invalid={error?.invalidEmail || undefined}
                aria-describedby={error ? errorId : undefined}
                required
                autoComplete="email"
                className={clsx(
                  "w-full sm:flex-1 px-3 py-2.5 rounded-md bg-slate-100 dark:bg-gray-900 dark:text-white transition-shadow duration-300 focus:outline-none",
                  error?.invalidEmail
                    ? "ring-2 ring-rose-400/70 dark:ring-rose-500/60"
                    : "focus:ring-2 focus:ring-teal-400/60 dark:focus:ring-teal-500/50",
                )}
                value={email}
                placeholder="Type your email..."
                onChange={handleInput}
                ref={emailInputRef}
              />
              <FancyButton
                type="submit"
                className="w-full sm:w-40 flex justify-center min-h-fit"
                disabled={loading}
                loading={loading}
                aria-label={loading ? undefined : "Subscribe to the newsletter"}
              >
                {loading ? <LoadingDots label="Subscribing" /> : "Subscribe"}
              </FancyButton>
            </div>

            {error && (
              <p
                id={errorId}
                role="alert"
                key={error.message}
                className="flex items-start gap-tight mt-label mb-0 text-sm text-rose-600 dark:text-rose-400 animate-rise-in motion-reduce:animate-none"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4 shrink-0 mt-0.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    clipRule="evenodd"
                  />
                </svg>
                {error.message}
              </p>
            )}

            {link || defaultLink}
          </form>
        </div>
      )}
    </div>
  );
};
