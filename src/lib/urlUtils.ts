export const tld = "ricos.site";

export const baseUrl = `https://${tld}`;
export const httpBaseUrl = `http://${tld}`;

export const completeUrl = (url: string) => {
  return new URL(url, baseUrl).toString();
};
