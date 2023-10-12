import { describe, expect, jest, test } from "bun:test";
import { createCorsMiddleware } from "./create-cors-middleware";

const defaultOrigin = "http://example.com";

describe("createCorsMiddleware function", () => {
  test("default values", async () => {
    const middleware = createCorsMiddleware({
      origins: [defaultOrigin],
      methods: ["GET", "POST", "PUT", "DELETE"],
      headers: ["Content-Type"],
    });

    const res = new Response();
    const requester = new Request(defaultOrigin, {
      method: "GET",
      headers: new Headers({
        Origin: defaultOrigin,
      }),
    });

    const next = jest.fn(() => {
      res.headers.append("Content-Type", "application/json"); // Add a header for demonstration purposes
      return res;
    });

    const response = middleware({
      request: requester,
      next,
      response: res,
    });

    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, PUT, DELETE"
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type"
    );
  });

  test("missing Origin header", async () => {
    const middleware = createCorsMiddleware({});
    const requester = new Request(defaultOrigin, { method: "GET" });
    const response = new Response();
    const next = jest.fn(() => response);

    const midRes = middleware({ request: requester, next, response });

    expect(midRes.status).toBe(400);
  });

  test("OPTIONS request", async () => {
    const middleware = createCorsMiddleware({
      methods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
      origins: [defaultOrigin],
    });
    const requester = new Request(defaultOrigin, {
      method: "OPTIONS",
      headers: new Headers({
        Origin: defaultOrigin,
        "Access-Control-Request-Method": "GET",
      }),
    });
    const response = new Response();
    const next = jest.fn(() => response);

    const resMid = middleware({ request: requester, next, response });

    expect(resMid.status).toBe(204);
    expect(resMid.headers.get("Access-Control-Allow-Methods")).toBe(
      "OPTIONS, GET, POST, PUT, DELETE"
    );
  });

  test("Allow all origins option", async () => {
    const middleware = createCorsMiddleware({
      methods: ["GET", "PATCH"],
      origins: ["*"],
    });
    const requester = new Request(defaultOrigin, {
      method: "GET",
      headers: new Headers({
        Origin: defaultOrigin,
      }),
    });
    const response = new Response();
    const next = jest.fn(() => response);
    const midResponse = middleware({ request: requester, next, response });

    expect(midResponse.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  test("unallowed method with OPTIONS request", async () => {
    const middleware = createCorsMiddleware({
      methods: ["GET"],
      origins: ["http://example.com"],
    });
    const request = new Request("http://example.com", {
      method: "OPTIONS",
      headers: {
        Origin: "http://example.com",
        "Access-Control-Request-Method": "PATCH",
      },
    });
    const response = new Response();
    const next = jest.fn(() => response);
    const midres = middleware({ request, next, response });

    expect(midres.status).toBe(405);
  });

  test("non-OPTIONS request", async () => {
    const middleware = createCorsMiddleware({
      methods: ["GET"],
      origins: [defaultOrigin],
    });
    const requester = new Request(defaultOrigin, {
      method: "GET",
      headers: new Headers({
        Origin: defaultOrigin,
      }),
    });
    const response = new Response();
    const next = jest.fn(() => response);

    const midRes = middleware({ request: requester, next, response });

    expect(midRes?.headers.get("Access-Control-Allow-Origin")).toBe(
      defaultOrigin
    );
  });
  test("should return a middleware function", () => {
    const middleware = createCorsMiddleware({});
    expect(typeof middleware).toBe("function");
  });

  test("should set Access-Control-Allow-Origin header to request origin", async () => {
    const middleware = createCorsMiddleware({
      origins: ["http://example.com"],
    });

    // Add the 'Origin' header to the request.
    const request = new Request("http://example.com", {
      headers: { Origin: "http://example.com" },
    });

    const response = new Response();

    const responseMid = middleware({
      request,
      next: () => response,
      response,
    });
    expect(responseMid.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://example.com"
    );
  });

  test("should set Access-Control-Allow-Origin header to * if allowedOrigins includes *", async () => {
    const middleware = createCorsMiddleware({ origins: ["*"] });
    const request = new Request("http://example.com", {
      headers: { Origin: "http://example.com" },
    });

    const response = new Response();
    const resMid = middleware({
      request,
      next: () => response,
      response,
    });
    expect(resMid.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  test("should set Access-Control-Allow-Methods header to allowedMethods", async () => {
    const middleware = createCorsMiddleware({
      methods: ["GET", "POST"],
      origins: ["http://example.com"],
    });
    const request = new Request("http://example.com", {
      headers: { Origin: "http://example.com" },
    });

    const response = new Response();

    const resMid = middleware({
      request,
      next: () => response,
      response,
    });
    expect(resMid.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST"
    );
  });

  test("should set Access-Control-Allow-Headers header to allowedHeaders", async () => {
    const middleware = createCorsMiddleware({
      headers: ["Content-Type"],
      origins: ["http://example.com"],
    });
    const request = new Request("http://example.com", {
      headers: {
        Origin: "http://example.com",
        "Content-Type": "application/json",
      },
    });

    const response = new Response();
    const resMid = middleware({
      request,
      next: () => response,
      response,
    });
    expect(resMid.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type"
    );
  });

  test("should return 400 Bad Request if request does not have Origin header", async () => {
    const middleware = createCorsMiddleware({});
    const request = new Request("http://example.com");
    const response = new Response();
    const midRes = middleware({
      request,
      next: () => response,
      response,
    });

    expect(midRes.status).toBe(400);
  });

  test("should return 403 Forbidden if request origin is not allowed", async () => {
    const middleware = createCorsMiddleware({
      origins: ["http://example.com"],
    });
    const request = new Request("http://example.org", {
      headers: { Origin: "http://example.org" },
    });
    const response = new Response("Hello, world!");
    const resMid = middleware({
      request,
      next: () => response,
      response,
    });
    expect(resMid.status).toBe(403);
  });

  test("should return 405 Method Not Allowed if request method is not allowed", async () => {
    const middleware = createCorsMiddleware({
      methods: ["GET"],
      origins: ["http://example.com"],
    });
    const request = new Request("http://example.com", {
      method: "POST",
      headers: {
        Origin: "http://example.com",
        "Access-Control-Request-Method": "POST",
      },
    });
    const response = new Response();
    const resMid = middleware({
      request,
      next: () => resMid,
      response: response,
    });
    expect(resMid.status).toBe(405);
  });

  test("should return 204 No Content if request method is OPTIONS and allowed", async () => {
    const middleware = createCorsMiddleware({
      methods: ["GET"],
      origins: ["http://example.com"],
    });
    const request = new Request("http://example.com", {
      method: "OPTIONS",
      headers: {
        Origin: "http://example.com",
        "Access-Control-Request-Method": "GET",
      },
    });

    const response = new Response();
    const resMid = middleware({
      request,
      next: () => response,
      response,
    });
    expect(resMid.status).toBe(204);
  });
});
