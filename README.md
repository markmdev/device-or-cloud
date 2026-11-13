# Device or Cloud

Which of your app's AI features can run on your users' own devices? Firebase AI Logic's hybrid inference lets a web app send a prompt to the model built into Chrome or to Gemini in the cloud. This project checks, feature by feature, where the answers are good enough to stay on the device.

Working name; being built for the Firebase #BuildHybridAI hackathon. Right now the page sends one prompt through Firebase AI Logic twice, once in device-only mode and once in cloud-only mode, and shows where each answer ran.

Live: https://device-or-cloud.web.app (Chrome on a computer, for the device side).

## Run your own copy

You need a Firebase project on the free Spark plan with a web app registered, Firebase AI Logic set up with the Gemini Developer API, and App Check with a reCAPTCHA Enterprise site key for your Hosting domain.

```sh
npm install
echo "VITE_RECAPTCHA_SITE_KEY=<your site key>" > .env.local
npx firebase use <your project id>
npm run deploy
```

The deploy publishes the page to Firebase Hosting, turns on anonymous sign-in, and publishes the Firestore rules and the Remote Config template. The page reads the project's config from Firebase Hosting at `/__/firebase/init.json`, so no config or key is in this repo.

`scripts/walk.mjs` opens the live page in a Chrome that already has the built-in model and checks that one answer ran on the device and one in the cloud.

## Licence

Apache 2.0.
