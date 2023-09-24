import { HttpMethod } from "mod/utils/http-types";

type EventHandlerMap = { [event: string]: (ev: MessageEvent) => void };

export type APIConfig<
  TRes = any,
  TParams = any,
  TBody = any,
  THeaders extends HeadersInit = HeadersInit
> = {
  method: HttpMethod;
  endpoint: string;
  response?: TRes;
  params?: TParams;
  body?: TBody;
  headers?: THeaders;
};

export type TypeMap = {
  [endpoint: string | number]: APIConfig;
};

export function appendURLParameters(
  url: string,
  params: Record<string, string> = {}
): string {
  const urlWithParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    urlWithParams.append(key, value);
  });
  return urlWithParams.toString() ? `${url}?${urlWithParams.toString()}` : url;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(JSON.stringify(response)); // adapt this to your needs
  }
  return await response.json();
}

export type FileDownloadConfig = {
  endpoint: string;
  headers?: HeadersInit;
  filename?: string;
  params?: Record<string, string>;
};

export type MappedApiConfig<TMap extends TypeMap> = APIConfig<
  TMap[keyof TMap]["response"],
  TMap[keyof TMap]["params"],
  TMap[keyof TMap]["body"],
  HeadersInit
>;

export type ExternalFetchConfig<
  Endpoint,
  TMap extends TypeMap,
  Method extends HttpMethod = HttpMethod
> = Omit<MappedApiConfig<TMap>, "response" | "method"> & {
  endpoint: Endpoint;
  method?: Method;
};

function computeHeaders(
  defaultHeaders: HeadersInit,
  customHeaders?: HeadersInit
): HeadersInit {
  const resultHeaders = new Headers(defaultHeaders);

  if (customHeaders instanceof Headers) {
    for (const [key, value] of customHeaders.entries()) {
      resultHeaders.set(key, value);
    }
  } else if (Array.isArray(customHeaders)) {
    customHeaders.forEach(([key, value]) => {
      resultHeaders.set(key, value);
    });
  } else {
    for (const [key, value] of Object.entries(customHeaders || {})) {
      resultHeaders.set(key, value as string);
    }
  }

  return resultHeaders;
}

export async function fetcher<Endpoint extends keyof TMap, TMap extends TypeMap>(
  fetcherConfig: ExternalFetchConfig<Endpoint, TMap>,
  config: Record<keyof TMap, MappedApiConfig<TMap>>,
  baseUrl: string
  // computeHeadersFunction: (headers?: HeadersInit) => HeadersInit
): Promise<TMap[Endpoint]["response"]> {
  const endpointConfig = config[fetcherConfig.endpoint];
  const finalUrl = appendURLParameters(
    baseUrl + endpointConfig.endpoint,
    fetcherConfig.params
  );

  const method = endpointConfig.method;
  let bodyData = "";

  if (fetcherConfig.body) {
    bodyData = JSON.stringify(fetcherConfig.body);
  }

  const response = await fetch(finalUrl, {
    method: method.toUpperCase(),
    headers: fetcherConfig?.headers,
    body: bodyData,
  });

  return handleResponse(response);
}

export function fileDownload(config: FileDownloadConfig, baseUrl: string): void {
  if (typeof window === "undefined") return;
  const finalUrl = new URL(baseUrl + config.endpoint);
  if (config.params) {
    Object.keys(config.params).forEach((key) => {
      finalUrl.searchParams.append(key, config.params![key]);
    });
  }

  const a = document.createElement("a");
  a.href = finalUrl.toString();
  a.download = config.filename || "";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function createEventStream(
  endpoint: string,
  eventHandlers: EventHandlerMap,
  baseUrl: string
): EventSource {
  const url = baseUrl + endpoint;
  const es = new EventSource(url);

  es.onopen = (event) => {
    console.info("Stream opened:", event);
  };

  es.onerror = (error) => {
    console.error("Stream Error:", error);
  };

  for (const [event, handler] of Object.entries(eventHandlers)) {
    es.addEventListener(event as string, handler);
  }

  return es;
}
