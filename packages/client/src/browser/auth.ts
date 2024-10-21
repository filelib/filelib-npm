/**
 * Authenticate with FileLib API
 * */
import {
  AuthMissingCredentialError,
  FilelibAPIResponseError,
} from "../exceptions";
import {
  FILELIB_API_AUTH_BROWSER_URL,
  FILELIB_API_AUTH_URL,
} from "../constants";
import { AuthOptions } from "../types";
import { default as BaseAuth } from "../blueprints/auth";
import { v4 as randomUUID } from "uuid";

export default class Auth extends BaseAuth {
  /**
   * Initialize an Auth instance that will handle authentication with Filelib API.
   * @param authKey {string} - Pass credential key directly.
   */
  constructor({ authKey }: Partial<AuthOptions>) {
    super();
    this.authKey = authKey;

    if (!authKey) {
      throw new AuthMissingCredentialError(
        "Auth Key(authKey) must be provided.",
      );
    }
    this.authKey = authKey;
  }

  /**
   * This to create a cross-domain cookie that we can send in the request headers to Filelib
   * - Load the iframe with the api key.
   * - Submit form to the Iframe with session value.
   * - Create cookie with iframe response.
   * - include it in the request to authenticate.
   */
  private createIFrame() {
    if (!document) {
      return Promise.reject("No Browser document detected.");
    }
    const bodyEl = document.getElementsByTagName("body");
    if (bodyEl.length === 0) {
      return Promise.reject("No Body element.");
    }

    const target = `${FILELIB_API_AUTH_BROWSER_URL}${this.authKey}/`;
    const iframeName = "filelib-auth-iframe";
    let IframeEl = document.createElement("iframe");
    IframeEl.setAttribute("src", target);
    IframeEl.setAttribute("name", iframeName);
    IframeEl.setAttribute("width", "130px");
    IframeEl.setAttribute("height", "130px");
    IframeEl.setAttribute("style", "display:none");

    // Avoid duplicate creations with react/other re-renders.
    if (document.getElementsByName(iframeName).length > 0) {
      IframeEl = document.getElementsByName(iframeName)[0] as HTMLIFrameElement;
    }

    bodyEl[0].appendChild(IframeEl);
    let submitForm = document.createElement("form");
    submitForm.setAttribute("action", target);
    submitForm.setAttribute("style", "display:none");
    submitForm.setAttribute("method", "POST");
    submitForm.setAttribute("target", iframeName);
    submitForm.setAttribute("filelibIframeForm", iframeName);

    const authInput = document.createElement("input");
    authInput.setAttribute("type", "text");
    authInput.setAttribute("name", "auth_key");
    authInput.setAttribute("value", this.authKey!);

    const nonceInput = document.createElement("input");
    nonceInput.setAttribute("type", "hidden");
    nonceInput.setAttribute("name", "nonce");
    nonceInput.setAttribute("value", randomUUID());

    const btn = document.createElement("input");
    btn.setAttribute("type", "submit");

    submitForm.appendChild(authInput);
    submitForm.appendChild(nonceInput);
    submitForm.appendChild(btn);
    if (
      document.querySelectorAll(`[filelibIframeForm='${iframeName}']`).length <
      1
    ) {
      bodyEl[0].appendChild(submitForm);
    } else {
      submitForm = document.querySelector(
        `[filelibIframeForm='${iframeName}']`,
      ) as HTMLFormElement;
    }

    // Return a promise to be able to chain
    return new Promise((resolve) => {
      IframeEl.onload = () => {
        window.addEventListener("message", function (event) {
          // console.log("Message received from the child:", event.origin, event.data)
          resolve(event.data as string); // Message received from child
        });
        submitForm.submit();
        IframeEl.onload = () => {
          IframeEl.onload = null;
        };
      };
    });
  }

  public async acquire_access_token(): Promise<string> {
    const nonce = await this.createIFrame();
    const headers = {
      Authorization: `Basic ${this.authKey}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(FILELIB_API_AUTH_URL, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ nonce }),
      headers,
    });
    const { status, data, error } = await response.json();
    if (!status) throw new FilelibAPIResponseError(error);
    this.access_token = data.access_token!;
    this.expiration = new Date(data.expiration);
    return data.access_token as string;
  }
}
