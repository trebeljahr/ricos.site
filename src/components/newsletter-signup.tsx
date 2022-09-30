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

export const NewsletterForm = () => {
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
      console.log(data);

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

  return (
    <div className="newsletter">
      {success ? (
        <>
          <h2>
            Success <span className="icon-check-circle"></span>
          </h2>
          <p>{success}</p>
        </>
      ) : (
        <>
          <h2>Subscribe to my newsletter</h2>
          <p>
            Once a month. 1 Booknote. 1 Photo. 1 Link. 1 Post. Bundled together
            in one heck of a Newsletter.
          </p>
          {error && <p className="error">{error}</p>}
          <div className="form">
            <input
              name="email"
              type="email"
              required
              value={email}
              placeholder="Your very best email"
              onChange={handleInput}
            />
            <button
              className={loading ? "inactive" : "active"}
              onClick={handleSubmit}
            >
              {loading ? (
                <ClipLoader
                  color={"rgb(68, 160, 255)"}
                  loading={true}
                  size={20}
                />
              ) : (
                "Subscribe"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
