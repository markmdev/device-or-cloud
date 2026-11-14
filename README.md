# Device or Cloud

Which of your app's AI features can run on your users' own devices?

Firebase AI Logic's hybrid inference lets a web app send a prompt to the model built into Chrome or to Gemini in the cloud, and asks you to pick a mode for every feature. This project checks, feature by feature, where the small model's answers are good enough, and turns the result into the app's settings.

Working name; built for the Firebase #BuildHybridAI hackathon.

- **The check:** https://device-or-cloud.web.app
- **The sample shop it checks:** https://device-or-cloud.web.app/shop/
- **Check your own prompts:** https://device-or-cloud.web.app/own/

Open them in Chrome on a computer to see the device side run.

## What is here

**The sample shop** (`shop/`, `src/shop/`) is a small made-up shop, Larkfield, with eight AI features: routing a support ticket, reading a review's mood, pulling fields from a receipt, rewriting a product title, summarising a delivery note, working out an invoice total, pulling an address from an email and answering a returns question. Each feature reads its inference mode from Firebase Remote Config and calls Firebase AI Logic in that mode. Every answer carries a badge that says where the SDK reports it ran.

**The check** (`index.html`, `src/check/`) sends each feature 25 inputs through Firebase AI Logic: three times to Chrome's model in device-only mode, once to Gemini in cloud-only mode. It gives each feature one verdict, against a bar the reader sets with a slider: how many wrong answers in 100 the feature can live with. The default is 10.

- **Runs on the device:** Chrome's model stays within the bar. Sets `prefer_on_device`.
- **Keep in the cloud:** only the cloud model stays within it. Sets `only_in_cloud`.
- **Fix the prompt first:** neither model does.
- **Not enough inputs to tell:** fewer than 20 inputs.

The page shows the check as recorded on our laptop, with every wrong answer side by side with the input and the other model's answer. "Run it on your own computer" runs the device side again on yours.

**Check your own prompts** (`own/`, `src/own/`) gives the same verdicts for a feature you paste: the instruction your app sends, the shape of the answer and a few inputs. The cloud model writes 30 more inputs from yours, hard ones included, with the right answer where there is one; you tick the ones a real user could send and correct the answers. An input with a right answer is decided by code. One without is judged by the cloud model, and the page says which. One ticked input in four is kept out of the check, so a one-line fix to the prompt is proved on inputs it wasn't written from. Your features and their answers are kept only in your browser.

The cloud side runs on Google's free Gemini tier, which the whole site shares: 15 requests a minute and 500 a day. One feature uses about 30. Google may use what is sent to that tier to improve its products, and the page says so before you paste.

**The inputs and their right answers** are in `src/features/`. Code decides whether an answer is right wherever an input has one right answer: a category, a date, a total, an address, a yes or no. For receipts, invoices and returns questions, the input text and the right answer are built from the same figures, so the key can't disagree with the input. Two features, the product title and the delivery note, have no single right answer. Code checks their rules (length, required details), and the cloud model judges the rest, 25 answers in one request.

## Where Firebase is used

- `src/firebase.ts`: Firebase AI Logic (`firebase/ai`) with the Gemini Developer API, one model for each feature and mode, and App Check with reCAPTCHA Enterprise.
- `src/check/ask.ts`: every request, on the device or in the cloud, and where the SDK says the answer ran.
- `src/shop/main.tsx`: Remote Config holds each feature's mode, and the shop follows a change without a reload.
- `firebase.json`: Hosting, anonymous Authentication, Firestore rules and the Remote Config template, all deployed with one command.

One thing we learned from the SDK's source: in hybrid mode the request's system instruction and output shape reach only the cloud model. Chrome's model takes them from `onDeviceParams`. `modelFor` in `src/firebase.ts` sets both.

## Run your own copy

You need a Firebase project on the free Spark plan with a web app registered, Firebase AI Logic set up with the Gemini Developer API, and App Check with a reCAPTCHA Enterprise site key for your Hosting domain.

```sh
npm install
echo "VITE_RECAPTCHA_SITE_KEY=<your site key>" > .env.local
npx firebase use <your project id>
npm run deploy
```

`npm run deploy` writes the Remote Config template from the recorded verdicts (`scripts/modes.ts`), builds the pages and deploys Hosting, the Remote Config template, the Firestore rules and anonymous sign-in. The pages read the project's config from Firebase Hosting at `/__/firebase/init.json`, so no config or key is in this repo.

To record the check on your own machine, add an App Check debug token for your web app to `.env.local` as `VITE_APPCHECK_DEBUG_TOKEN`, start `npm run dev`, start Chrome with `--remote-debugging-port=9222` and run `CDP=http://127.0.0.1:9222 node scripts/record.mjs`. It writes `src/check/recorded.json`. The free tier allows 15 cloud requests a minute and 500 a day for the whole project; the recording waits out a full minute and resumes after a full day.

`scripts/walk.mjs` walks the whole path on the live site: the recorded check, a live run, a feature pasted into "Check your own prompts", every shop feature, and the shop with the network off.

## Licence

Apache 2.0.
