import { faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ChangeEvent, MouseEvent, useState } from "react";
import { ClipLoader } from "react-spinners";

async function fetchData(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  if (!response.ok || response.status !== 200) {
    let err = new Error("HTTP status code: " + response.status + response);

    const errorMessage = await response.json();
    throw err;
  }

  return response;
}

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

export const NewsletterForm = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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
      await fetchData("/api/signup", {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: headers,
      });

      setSuccess(true);
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
            Success <FontAwesomeIcon icon={faCheckCircle} color={"#1fd655"} />
          </h2>
          <p>Now check your mail to confirm your subscription!</p>
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

// export const NewsletterFormConvertKit = () => {
//   const config = {
//     formId: "3619182",
//     template: "mills",
//     emailPlaceholder: "Enter an email address",
//     submitText: "Sign up",
//     disclaimerText: "",
//   };
//   return <ConvertKitForm {...config} />;
// };
