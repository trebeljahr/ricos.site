import Link from "next/link";
import { ChangeEvent, MouseEvent, useEffect, useState } from "react";
import { ReactElement } from "react-markdown/lib/react-markdown";
import Modal from "react-modal";
import { ClipLoader } from "react-spinners";
import { useScrollVisibility } from "./ShowAfterScrolling";
async function fetchData(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  if (!response.ok || response.status !== 200) {
    let err = new Error("HTTP status code: " + response.status + response);

    throw err;
  }

  return await response.json();
}

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

function useNewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setError("Not a valid email address");
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

  return {
    loading,
    handleInput,
    handleSubmit,
    success,
    error,
    email,
  };
}

Modal.setAppElement("#__next");

export const NewsletterModalPopup = () => {
  const [open, setOpen] = useState(true);
  const { visible } = useScrollVisibility({
    hideAgain: false,
    howFarDown: 1.5,
  });

  function closeModal() {
    setOpen(false);
    localStorage.setItem("newsletter-popup", "closed");
  }

  useEffect(() => {
    if (!localStorage) return;
    setOpen(localStorage.getItem("newsletter-popup") !== "closed");
  }, []);

  useEffect(() => {
    if (!document) return;

    const root = document.getElementById("__next");
    if (!root) return;

    if (open && visible) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      root.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
      root.style.overflow = "auto";
    }

    return () => {
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
      root.style.overflow = "auto";
    };
  }, [open, visible]);

  return (
    <Modal
      isOpen={open}
      onRequestClose={closeModal}
      contentLabel="Newsletter Popup Form"
      style={{
        overlay: {
          visibility: visible ? "visible" : "hidden",
          transition: "visibility 0.5s linear,opacity 0.5s linear",
          opacity: visible ? 1 : 0,
          zIndex: 100,
        },
        content: {
          visibility: visible ? "visible" : "hidden",
          transition: "visibility 0.3s linear,opacity 0.3s linear",
          opacity: visible ? 1 : 0,
          zIndex: 100,
        },
      }}
      className="fixed overflow-hidden flex items-center justify-center top-0 left-0 bg-white w-screen h-screen"
    >
      <div className="w-3/6">
        <NewsletterForm
          heading={<h2>Not subscribed yet?</h2>}
          text={<></>}
          link={
            <button onClick={closeModal} className="flex mt-10">
              <span>Continue Reading</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
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
  const form = useNewsletterForm();
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
    <p>
      Twice a month. Quotes, photos, booknotes and interesting links. Bundled
      together in one heck of a Newsletter. No spam. No noise.{" "}
    </p>
  );

  const defaultHeading = <h2>Subscribe to Live and Learn</h2>;

  return form.success ? (
    <div>
      <h2 className="pt-0">
        Success <span className="icon-check-circle newsletter-success"></span>
      </h2>
      <p>{form.success}</p>
      {link || null}
    </div>
  ) : (
    <div className="mt-20">
      {heading || defaultHeading}
      {text || defaultText}

      <div className="form">
        <input
          name="email"
          type="email"
          required
          className="newsletter-input"
          value={form.email}
          placeholder="Type your email..."
          onChange={form.handleInput}
        />
        {form.error && <p className="error">{form.error}</p>}

        <button
          className={
            "newsletter-button " + (form.loading ? "inactive" : "active")
          }
          onClick={form.handleSubmit}
        >
          {form.loading ? (
            <ClipLoader color={"rgb(68, 160, 255)"} loading={true} size={20} />
          ) : (
            "Subscribe"
          )}
        </button>
        {link || defaultLink}
      </div>
    </div>
  );
};
