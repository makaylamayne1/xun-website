# Xun Chen website — repaired contact form

## What changed

The academic content, photograph, CV, teaching evaluations, navigation, and desktop/mobile layout are preserved. Turnstile now keeps one compact widget without a custom ResizeObserver; resizing preserves verification. Email-service errors stay visible after fresh verification, and failed submissions preserve the typed message. The existing public Site key and API URL are already in `.env.local`, beside `package.json`.

## 1. Run locally on Windows

Extract this whole ZIP into a new folder and open that folder in VS Code. Double-click `RUN-LOCAL.cmd`, or run these commands in the folder containing `package.json`:

```sh
npm ci
npm start
```

Open http://localhost:3000. Keep `.env.local` outside `src`. If you change it, stop the server with Ctrl+C and run `npm start` again.

## 2. Apply the AWS repair once

The local website can run before uploading anything to Cloudflare. The API's HTTP 500 needs an AWS configuration repair; replacing website files alone cannot resolve it.

The setup targets your existing account `811106941521`, region `us-east-2` (Ohio), Lambda `xun-website-contact`, API `ss3lnbimmb`, and route `POST /contact`. Sender and recipient are both `xunchenecon@gmail.com`.

Before running:

1. In SES in Ohio, confirm `xunchenecon@gmail.com` is Verified.
2. In Lambda environment variables, ensure `TURNSTILE_SECRET_KEY` contains the Secret key for the same Cloudflare widget as the website's Site key. The script preserves that existing secret. No AWS access keys or Turnstile secrets are included in this ZIP.

In AWS CloudShell, choose Actions → Upload file and upload **`aws-setup.zip`** from this extracted folder. Run:

```bash
unzip -o aws-setup.zip -d xun-contact-setup
bash xun-contact-setup/repair-contact.sh
```

The script deploys the included CommonJS `index.js`, sets `index.handler`, Node.js 24.x, and a 15-second timeout; updates the Lambda role's SES permission; preserves existing environment variables while setting Gmail delivery; creates or repairs `POST /contact`; grants this API permission to invoke Lambda; configures CORS; enables automatic deployment on `$default`; and adds API integration-error logging. Re-running it checks and reuses its existing permission.

Its final test sends an empty form. **HTTP 400 with “Check your name, email, and message.” means the correct Lambda is reachable.** This test sends no email and does not verify the real CAPTCHA or SES delivery.

If the script stops, retain the error output. For a failed final connection check, inspect CloudWatch log groups `/aws/apigateway/xun-website-contact` (including `integrationError`) and `/aws/lambda/xun-website-contact`. The supplied Lambda does not log tokens or visitor message bodies.

## 3. Test a real message

Refresh http://localhost:3000, fill out Contact, wait for Turnstile Success, and select Send Message. Look for the submitted confirmation, then check `xunchenecon@gmail.com`, including Spam. The visitor's email is Reply-To. Successful submission means SES accepted the message; inbox delivery still needs checking.

## 4. Upload the website to Cloudflare Pages

The included **`cloudflare-upload.zip`** and **`build/`** are the successful production build. For a Pages project using dashboard Direct Upload, upload `cloudflare-upload.zip` or the contents of `build/`. Its `index.html` is at ZIP root. The entire source ZIP and `aws-setup.zip` are not website deployment assets.

For a Git-integrated Pages project, update the repository instead: build command `npm run build`, output directory `build`, and the two public `REACT_APP_...` variables from `.env.local` configured in the build environment.

After future edits, run `npm run build` and upload the newly generated `build/` folder. The provided `cloudflare-upload.zip` does not update automatically.

The current API CORS and Lambda origin allowlist contain:

- `http://localhost:3000`
- `https://www.xun-chen.com`
- `https://xun-chen.com`

In Cloudflare Turnstile, allow `localhost` and your actual website hostname, without `https://`, paths, or ports. For a `pages.dev` preview or different domain, also add its exact origin to API Gateway CORS and Lambda `ALLOWED_ORIGINS`, and its hostname to Turnstile. An unknown Pages preview URL is not preconfigured.

## Editing later

| File | Content |
| --- | --- |
| `src/about.js` | Introduction, public email, CV link |
| `src/research.js` | Working papers and publications |
| `src/content.js` | Work in progress and teaching |
| `src/pronunciation.js` | Name pronunciation |
| `src/contact.js` | Contact form |
| `src/App.css` | Desktop and mobile styling |
| `public/xun-chen.jpg` | Portrait |
| `public/Xun-Chen-CV.pdf` | Downloadable CV |
| `cv/Xun-Chen-CV.tex` | CV source |
| `aws/index.js` | Lambda source; deploy again after backend edits |
| `aws/EMAIL_SES.json` | SES permission for Gmail delivery |

## Verification completed

9 React contact tests, 12 Lambda tests, and 2 repair-workflow tests passed. Cloudflare, SES, and AWS CLI calls in tests were mocked; the repair tests cover both missing resources and re-running with existing resources. The obsolete CRA “learn react” sample test was replaced by contact tests. The production build compiled successfully. Browser QA was unavailable in this workspace.

No live AWS deployment or real email delivery was performed here. Run the supplied setup in your AWS account and submit a real form message to verify delivery.

Official references:

- https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-troubleshooting-lambda.html
- https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html
- https://docs.aws.amazon.com/ses/latest/dg/verify-addresses-and-domains.html
- https://developers.cloudflare.com/pages/get-started/direct-upload/
