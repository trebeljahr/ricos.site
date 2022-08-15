export const UtteranceComments: React.FC = () => (
  <>
    <h2>Comments:</h2>
    <section
      ref={(elem) => {
        if (!elem || document.querySelector(".utterances")) {
          return;
        }

        const scriptElem = document.createElement("script");
        scriptElem.src = "https://utteranc.es/client.js";
        scriptElem.async = true;
        scriptElem.crossOrigin = "anonymous";
        scriptElem.setAttribute("repo", "trebeljahr/blog");
        scriptElem.setAttribute("issue-term", "pathname");
        scriptElem.setAttribute("label", "blog-comment");
        scriptElem.setAttribute("theme", "github-light");
        elem.appendChild(scriptElem);
      }}
    />
  </>
);
