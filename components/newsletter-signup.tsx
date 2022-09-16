import ConvertKitForm from "convertkit-react/bin/convertkit-react.esm";

export const NewsletterForm = () => {
  return (
    <form
      style={{ border: "1px solid #ccc", padding: "3px", textAlign: "center" }}
      action="https://tinyletter.com/trebeljahr"
      method="post"
      target="popupwindow"
      onSubmit={() => {
        window.open(
          "https://tinyletter.com/trebeljahr",
          "popupwindow",
          "scrollbars=yes,width=800,height=600"
        );
        return true;
      }}
    >
      <p>
        <label htmlFor="tlemail">Enter your email address</label>
      </p>
      <p>
        <input
          type="text"
          style={{ width: "140px" }}
          name="email"
          id="tlemail"
        />
      </p>
      <input type="hidden" value="1" name="embed" />
      <input type="submit" value="Subscribe" />
    </form>
  );
};

export const NewsletterFormConvertKit = () => {
  const config = {
    formId: "3619182",
    template: "mills",
    emailPlaceholder: "Enter an email address",
    submitText: "Sign up",
    disclaimerText: "",
  };
  return <ConvertKitForm {...config} />;
};
