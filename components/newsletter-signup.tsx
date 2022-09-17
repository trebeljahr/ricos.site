import { ChangeEvent, MouseEvent, useState } from "react";
import { CircleLoader, ClimbingBoxLoader, ClipLoader } from "react-spinners";

async function fetchData(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  if (!response.ok) {
    let err = new Error("HTTP status code: " + response.status + response);

    console.log(response);
    const errorMessage = await response.json();
    console.log(errorMessage);

    throw err;
  }
  return response;
}

async function sleep() {
  return new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
}

export const NewsletterForm = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return <p>An error occurred...</p>;
  }

  const handleSubmit = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setLoading(true);

    const headers = new Headers();

    headers.append("Accept", "application/json, text/plain, */*");
    headers.append("Content-Type", "application/json");

    // await fetchData("/api/signup", {
    //   method: "POST",
    //   body: JSON.stringify({ email }),
    //   headers: headers,
    // }).catch((err) => {
    //   console.log(err);
    //   setError(err);
    // });

    await sleep();

    // setSuccess(true);
    setLoading(false);
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  if (success) {
    return (
      <div className="emailNewsletter">
        <p>Success... now check your mail to confirm your subscription!</p>
      </div>
    );
  }

  return (
    <div className="newsletter">
      <h2>
        Subscribe to 1<sup>4</sup>
      </h2>
      <p>
        Once a month. 1 Booknote. 1 Photo. 1 Link. 1 Post. Bundled together in
        one heck of a Newsletter.
      </p>
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
            <ClipLoader color={"rgb(68, 160, 255)"} loading={true} size={20} />
          ) : (
            "Subscribe"
          )}
        </button>
      </div>
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
