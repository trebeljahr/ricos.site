import ConvertKitForm from "convertkit-react/bin/convertkit-react.esm";
import { ChangeEvent, MouseEvent, useState } from "react";

export const NewsletterForm = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return <p>An error occurred</p>;
  }

  const handleSubmit = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const baseUrl = process.env.NEXT_PUBLIC_EMAIL_NEWSLETTER_HOST;
    setLoading(true);

    const headers = new Headers();

    headers.append("Accept", "application/json, text/plain, */*");
    headers.append("Content-Type", "application/json");

    await fetch(baseUrl + "/signup", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: headers,
    }).catch((err) => setError(err));

    setSuccess(true);
    setLoading(false);
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  if (success) {
    return <p>Success... now check your mail to confirm your subscription!</p>;
  }

  return (
    <div>
      <p>
        <label htmlFor="email">Enter your email address</label>
      </p>
      <input
        id="email"
        name="email"
        type="text"
        value={email}
        onChange={handleInput}
      />
      <button type="submit" onClick={handleSubmit}>
        {loading ? "Loading..." : "Submit"}
      </button>
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
