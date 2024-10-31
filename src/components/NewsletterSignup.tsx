"use client";

import Link from "next/link";
import { ChangeEvent, useRef, useState } from "react";
import ConfettiExplosion, { ConfettiProps } from "react-confetti-explosion";
import { FaCheckCircle } from "react-icons/fa";
import { ReactElement } from "react-markdown/lib/react-markdown";
import { ClipLoader } from "react-spinners";

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
    <Link
      as="/newsletters"
      href="/newsletters"
      className="block w-fit mt-5 font-light"
    >
      Check out what you missed so far.
    </Link>
  );

  const defaultText = (
    <>
      <p className="mb-4">
        Join the Live and Learn Newsletter to receive bi-weekly insights
        straight to your inbox!
      </p>
    </>
  );

  const defaultHeading = (
    <h2 className="pt-0 mt-0">Subscribe to Live and Learn</h2>
  );

  return success ? (
    <div className="rounded-md overflow-hidden p-3 py-3 -ml-1 bg-white prose shadow-lg">
      <div className="newsletter-success-container mb-10" />
      <div className="ml-2 md:ml-5">
        <div className="flex w-full justify-center">
          <ConfettiExplosion {...mediumConfettiProps} />
        </div>
        <h2 className="pt-0 mt-0 mb-3 flex items-center">
          Success
          <FaCheckCircle className="newsletter-success ml-2" />
        </h2>
        <p>{success}</p>

        {!link && defaultLink}

        <button
          className="mt-5 font-thin text-left"
          onClick={() => setSuccess(null)}
          aria-label="Sign up with another email address"
        >
          Want to sign up with another email address?
        </button>
      </div>

      <div className="newsletter-success-container mt-10" />
    </div>
  ) : (
    <>
      {heading || defaultHeading}
      {text || defaultText}

      <form className="form">
        <input
          name="email"
          type="email"
          aria-invalid={!!error}
          aria-describedby={error ? "email-error" : undefined}
          required
          autoComplete="email"
          className={`focus:outline-none w-full border-b-2 border-gray-950 dark:border-gray-100 dark:text-white py-2 bg-inherit mb-6 ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : ""
          }`}
          value={email}
          placeholder="Type your email..."
          onChange={handleInput}
          ref={emailInputRef}
        />

        <button
          type="submit"
          className={`newsletter-button ${loading ? "inactive" : "active"}`}
          disabled={loading}
          onClick={handleSubmit}
          aria-label="Subscribe to the newsletter"
        >
          {loading ? (
            <ClipLoader color={"rgb(68, 160, 255)"} loading={true} size={20} />
          ) : (
            "Subscribe"
          )}
        </button>
        {link || defaultLink}
      </form>
    </>
  );
};
