export const tld = "ricos.site";

export const baseUrl = `https://${tld}`;
export const httpBaseUrl = `http://${tld}`;

export const completeUrl = (url: string) => {
  return new URL(url, baseUrl).toString();
};

export const getComparableLocalUrl = (url: string) => {
  const { pathname, search, hash } = new URL(url, baseUrl);
  return `${pathname}${search}${hash}`;
};

export const isSameLocalUrl = (currentUrl: string, targetUrl: string) => {
  return getComparableLocalUrl(currentUrl) === getComparableLocalUrl(targetUrl);
};
