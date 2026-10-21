import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ContactForm from "./contact";

let widget;
let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
  window.turnstile = {
    render: jest.fn((element, options) => {
      widget = options;
      return "test-widget";
    }),
    remove: jest.fn(),
  };
  global.fetch = jest.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
  delete window.turnstile;
});

async function readyForm() {
  render(<ContactForm siteKey="public-site-key" apiUrl="https://api.example.com/contact" />);
  await waitFor(() => expect(window.turnstile.render).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Test visitor" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "visitor@example.com" } });
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hello from the website." } });
}

test("blocks submission until Turnstile returns a token", async () => {
  await readyForm();
  const button = screen.getByRole("button", { name: "Send Message" });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(fetch).not.toHaveBeenCalled();
  act(() => widget.callback("fresh-token"));
  expect(button).toBeEnabled();
});

test("sends the token to Lambda and clears the form only after confirmed success", async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  await readyForm();
  act(() => widget.callback("fresh-token"));
  fireEvent.click(screen.getByRole("button", { name: "Send Message" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("submitted"));
  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toBe("https://api.example.com/contact");
  expect(JSON.parse(options.body)).toEqual({
    name: "Test visitor",
    email: "visitor@example.com",
    message: "Hello from the website.",
    turnstileToken: "fresh-token",
  });
  expect(screen.getByLabelText("Message")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Send Message" })).toBeDisabled();
  await waitFor(() => expect(window.turnstile.remove).toHaveBeenCalled());
});

test("keeps the message and resets verification after a server rejection", async () => {
  global.fetch.mockResolvedValue({ ok: false, json: async () => ({ success: false, message: "Verification expired." }) });
  await readyForm();
  act(() => widget.callback("expired-token"));
  fireEvent.click(screen.getByRole("button", { name: "Send Message" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Verification expired."));
  expect(screen.getByLabelText("Message")).toHaveValue("Hello from the website.");
  expect(screen.getByRole("button", { name: "Send Message" })).toBeDisabled();
});

test("does not report success for HTTP 200 with an unsuccessful response body", async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: false }) });
  await readyForm();
  act(() => widget.callback("fresh-token"));
  fireEvent.click(screen.getByRole("button", { name: "Send Message" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("could not be sent"));
  expect(screen.getByLabelText("Message")).toHaveValue("Hello from the website.");
});

test("expires the token and prevents another submission", async () => {
  await readyForm();
  act(() => widget.callback("fresh-token"));
  expect(screen.getByRole("button", { name: "Send Message" })).toBeEnabled();
  act(() => widget["expired-callback"]());
  expect(screen.getByRole("button", { name: "Send Message" })).toBeDisabled();
});

test("handles network failure without clearing the visitor's message", async () => {
  global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
  await readyForm();
  act(() => widget.callback("fresh-token"));
  fireEvent.click(screen.getByRole("button", { name: "Send Message" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Unable to reach"));
  expect(screen.getByLabelText("Message")).toHaveValue("Hello from the website.");
});

test("works with React Strict Mode without leaving duplicate widgets", async () => {
  const view = render(<React.StrictMode><ContactForm siteKey="public-site-key" /></React.StrictMode>);
  await waitFor(() => expect(window.turnstile.render).toHaveBeenCalledTimes(1));
  view.unmount();
  expect(window.turnstile.remove).toHaveBeenCalledTimes(1);
});

test("keeps one compact widget and a valid token when the viewport changes", async () => {
  await readyForm();
  expect(widget.size).toBe("compact");
  act(() => widget.callback("fresh-token"));
  fireEvent(window, new Event("resize"));
  expect(window.turnstile.render).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Send Message" })).toBeEnabled();
});

test("preserves a server error when fresh verification completes", async () => {
  global.fetch.mockResolvedValue({ ok: false, json: async () => ({ success: false, message: "Email service unavailable." }) });
  await readyForm();
  act(() => widget.callback("fresh-token"));
  fireEvent.click(screen.getByRole("button", { name: "Send Message" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Email service unavailable."));
  await waitFor(() => expect(window.turnstile.render).toHaveBeenCalledTimes(2));
  act(() => widget.callback("replacement-token"));
  expect(screen.getByRole("alert")).toHaveTextContent("Email service unavailable.");
  expect(screen.getByLabelText("Message")).toHaveValue("Hello from the website.");
});
