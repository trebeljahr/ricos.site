import Link from "next/link";
import { ChangeEvent, useRef, useState } from "react";
import ConfettiExplosion, { ConfettiProps } from "react-confetti-explosion";
import { FaCheckCircle } from "react-icons/fa";
import { ReactElement } from "react-markdown/lib/react-markdown";
import { FancyButton } from "./FancyUI";
import { SpinningLoader } from "./SpinningLoader";

async function fetchData(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  if (!response.ok || response.status !== 200) {
    let err = new Error("HTTP status code: " + response.status + response);
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
  link?: ReactElement;
  heading?: ReactElement;
  text?: ReactElement;
}) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
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
    } catch (err) {
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
        Join the Live and Learn Newsletter to receive updates on what happens in
        the world of AI and technology every two weeks on Sunday!
      </p>
    </>
  );

  const defaultHeading = (
    <h2 className="!mt-0">Subscribe to Live and Learn 🌱</h2>
  );

  return (
    <div className="w-full mt-32">
      {success ? (
        <div className="rounded-md overflow-hidden p-3 py-3 bg-white shadow-lg w-full">
          <div className="newsletter-success-ribbon w-full" />
          <div className="ml-2 md:ml-5">
            <div className="flex w-full justify-center">
              <ConfettiExplosion {...mediumConfettiProps} />
            </div>
            <h2 className="pt-0 mt-0 mb-3 flex items-center">
              Success
              <FaCheckCircle className="text-green-500 ml-2" />
            </h2>
            <p>{success}</p>

            {!link && defaultLink}

            <button
              className="mt-5 text-left"
              onClick={() => setSuccess(null)}
              aria-label="Sign up with another email address"
            >
              Want to sign up with another email address?
            </button>
          </div>

          <div className="newsletter-success-ribbon mt-10" />
        </div>
      ) : (
        <div className="px-5 py-10 rounded-lg bg-white dark:bg-gray-800 border-4 border-gray-200 dark:border-gray-700">
          {heading || defaultHeading}
          {text || defaultText}

          <form className="form flex flex-col justify-center">
            <div className="flex items-center">
              <input
                name="email"
                type="email"
                aria-invalid={!!error}
                aria-describedby={error ? "email-error" : undefined}
                required
                autoComplete="email"
                className={`pl-2 focus:outline-none w-1/2 bg-slate-100 dark:bg-gray-900  dark:text-white py-2.5 bg-inherit ${
                  error
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : ""
                }`}
                value={email}
                placeholder="Type your email..."
                onChange={handleInput}
                ref={emailInputRef}
              />
              <FancyButton
                onClick={handleSubmit}
                type="submit"
                className="w-40 flex justify-center min-h-fit ml-10"
                disabled={loading}
                aria-label="Subscribe to the newsletter"
              >
                {loading ? <SpinningLoader /> : "Subscribe"}
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
