import Link from "next/link";
import { type ChangeEvent, type FormEvent, type ReactNode, useRef, useState } from "react";
import ConfettiExplosion, { type ConfettiProps } from "react-confetti-explosion";
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

export const NewsletterForm = ({
  link,
  heading,
  text,
}: {
  link?: ReactNode;
  heading?: ReactNode;
  text?: ReactNode;
}) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (emailInputRef.current && !emailInputRef.current.checkValidity()) {
      setError(emailInputRef.current.validationMessage);
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
        body: JSON.stringify({ email }),
        headers: headers,
      });

      setSuccess(data.success);
      setLoading(false);
    } catch (_err) {
      setError("Something went wrong while signing up... maybe, try again?");
      setLoading(false);
    }
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const defaultLink = (
    <Link as="/newsletters" href="/newsletters" className="block w-fit mt-5">
      Check out what you missed so far.
    </Link>
  );

  const defaultText = (
    <>
      <p className="mb-4">
        Join the Live and Learn Newsletter to receive digital postcards filled with beauty, travel
        stories and links to nice things I have found, once or twice a month. No spam, ever. You can
        unsubscribe at any time.
      </p>
    </>
  );

  const defaultHeading = <h2 className="mt-0!">Subscribe to Live and Learn 🌱</h2>;

  return (
    <div className="mx-auto w-full max-w-prose mt-16">
      {success ? (
        <div className="relative overflow-hidden px-5 py-10 rounded-lg bg-white dark:bg-gray-800 border-4 border-gray-200 dark:border-gray-700">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-green-400 via-teal-400 to-blue-600"
          />
          <div className="flex w-full justify-center">
            <ConfettiExplosion {...mediumConfettiProps} />
          </div>
          <div className="animate-rise-in motion-reduce:animate-none">
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
            <h2 className="mt-5! mb-3">Almost there!</h2>
            <p className="mb-4">
              We sent a confirmation link to{" "}
              <span className="font-medium text-gray-900 dark:text-white">{email}</span>. Click it
              to complete your signup. If you don&apos;t see it, check your spam folder.
            </p>

            {!link && defaultLink}

            <button
              type="button"
              className="mt-3 text-left text-sm text-gray-500 dark:text-gray-400 underline decoration-gray-300 dark:decoration-gray-600 underline-offset-4 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer transition-colors"
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

          <form className="form flex flex-col justify-center" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <input
                name="email"
                type="email"
                aria-invalid={!!error}
                aria-describedby={error ? "email-error" : undefined}
                required
                autoComplete="email"
                className={`w-full sm:flex-1 pl-2 focus:outline-none bg-slate-100 dark:bg-gray-900  dark:text-white py-2.5 bg-inherit ${
                  error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                }`}
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

            {/* <button></button> */}
            {link || defaultLink}
          </form>
        </div>
      )}
    </div>
  );
};
