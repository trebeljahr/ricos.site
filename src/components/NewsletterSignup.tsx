"use client";

import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import ConfettiExplosion, { ConfettiProps } from "react-confetti-explosion";
import { FiChevronsRight, FiUserCheck, FiX } from "react-icons/fi";
import { FaCheckCircle } from "react-icons/fa";
import { ReactElement } from "react-markdown/lib/react-markdown";
import Modal from "react-modal";
import { ClipLoader } from "react-spinners";
import { useScrollVisibility } from "./ShowAfterScrolling";
import useLocalStorageState from "use-local-storage-state";

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

Modal.setAppElement("#__next");

export function useScrollLock(lock: boolean) {
  const lockScroll = useCallback(() => {
    document.body.style.overflow = "hidden";
  }, []);

  const unlockScroll = useCallback(() => {
    document.body.style.overflow = "auto";
  }, []);

  useEffect(() => {
    if (lock) {
      lockScroll();
    } else {
      unlockScroll();
    }

    return () => {
      unlockScroll();
    };
  }, [lock, lockScroll, unlockScroll]);
}

export const NewsletterModalPopup = () => {
  const [dismissed, setDismissed] = useLocalStorageState(
    "newsletter-popup-dismissed",
    {
      defaultValue: false,
    }
  );
  const { visible, setVisible } = useScrollVisibility({
    howFarDown: 1.5,
  });

  useScrollLock(visible && !dismissed);

  function closeModalForGood() {
    setVisible(false);
    setDismissed(true);
  }

  function closeModal() {
    setVisible(false);
  }

  if (dismissed) {
    return null;
  }

  return (
    <Modal
      isOpen={visible}
      onRequestClose={closeModal}
      contentLabel="Newsletter Popup Form"
      style={{
        overlay: {
          visibility: visible ? "visible" : "hidden",
          transition: "visibility 0.3s linear,opacity 0.3s linear",
          opacity: visible ? 1 : 0,
          zIndex: 300,
        },
        content: {
          visibility: visible ? "visible" : "hidden",
          transition: "visibility 0.3s linear,opacity 0.3s linear",
          opacity: visible ? 1 : 0,
          zIndex: 300,
        },
      }}
      className="fixed overflow-hidden flex items-center justify-center top-0 left-0 bg-white dark:bg-gray-800 w-screen h-screen"
    >
      <button
        onClick={closeModalForGood}
        className="absolute top-3 right-3 hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded-full"
      >
        <FiX className="w-6 h-6" />
      </button>
      <div className="w-3/6">
        <NewsletterForm
          heading={<h2 className="mt-0">Not subscribed yet?</h2>}
          text={
            <>
              <p className="mb-4">
                Join the Live and Learn Newsletter to receive bi-weekly insights
                straight to your inbox!
              </p>
              <ul className="list-disc list-inside mb-4">
                <li>✨ Inspiring quotes</li>
                <li>✍️ Exclusive posts on fascinating topics</li>
                <li>🖇️ Curated links to cutting-edge ideas</li>
                <li>🌌 Travel stories</li>
              </ul>
              <p className="mb-4">
                No spam. No noise. Just meaningful content to enrich your mind.
              </p>
            </>
          }
          link={
            <button
              onClick={closeModal}
              className="flex mt-10 justify-center items-center"
            >
              <span>Continue Reading for Now</span>
              <FiChevronsRight className="ml-2" />
            </button>
          }
        />
      </div>
    </Modal>
  );
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
      className="block mt-5 font-light"
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
        >
          Want to sign up with another email address?
        </button>
      </div>

      <div className="newsletter-success-container mt-10" />
    </div>
  ) : (
    <div>
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
          className={`newsletter-input ${
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
        >
          {loading ? (
            <ClipLoader color={"rgb(68, 160, 255)"} loading={true} size={20} />
          ) : (
            "Subscribe"
          )}
        </button>
        {link || defaultLink}
      </form>
    </div>
  );
};
