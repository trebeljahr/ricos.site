import Link from "next/link";
import { ChangeEvent, MouseEvent, useState } from "react";
import { ClipLoader } from "react-spinners";

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

export const NewsletterForm = () => {
  const form = useNewsletterForm();
  return form.success ? (
    <div>
      <h2 className="pt-0">
        Success <span className="icon-check-circle newsletter-success"></span>
      </h2>
      <p>{form.success}</p>
    </div>
  ) : (
    <div className="newsletter">
      <h2>Subscribe to Live and Learn</h2>

      <p>
        Twice a month. Quotes, photos, booknotes and interesting links. Bundled
        together in one heck of a Newsletter. No spam. No noise.{" "}
      </p>

      {form.error && <p className="error">{form.error}</p>}
      <div className="form">
        <input
          name="email"
          type="email"
          required
          value={form.email}
          placeholder="Your very best email"
          onChange={form.handleInput}
        />
        <button
          className={form.loading ? "inactive" : "active"}
          onClick={form.handleSubmit}
        >
          {form.loading ? (
            <ClipLoader color={"rgb(68, 160, 255)"} loading={true} size={20} />
          ) : (
            "Subscribe"
          )}
        </button>
      </div>

      <Link
        as="/newsletters"
        href="/newsletters"
        style={{ marginTop: "30px", fontSize: "20px" }}
      >
        Check out what you missed so far.
      </Link>
    </div>
  );
};
