import Utterances from "utterances-react";

export const UtteranceComments = () => {
  return (
    <Utterances
      repo="trebeljahr/blog"
      issueTerm="pathname"
      label=""
      theme="github-light"
      crossorigin="anonymous"
      async={false}
      style={`
      & .utterances {
        max-width: 950px;
      }
    `}
    />
  );
};
