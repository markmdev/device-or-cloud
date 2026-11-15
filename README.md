# Device or Cloud

Which of your app's AI features can run on your users' own devices?

Firebase AI Logic's hybrid inference lets a web app send a prompt to the model built into Chrome or to Gemini in the cloud, and asks you to pick a mode for every feature. This project checks, feature by feature, where the small model's answers are good enough, and turns the result into the app's settings.

Working name; built for the Firebase #BuildHybridAI hackathon. Everything here was built during the hackathon: the first commit is from 13 November 2026.

- **The check:** https://device-or-cloud.web.app
- **The sample shop it checks:** https://device-or-cloud.web.app/shop/
- **Check your own prompts:** https://device-or-cloud.web.app/own/
- **Every input and answer of the recorded check:** https://device-or-cloud.web.app/results/

Open them in Chrome on a computer to see the device side run.

## What is here

**The sample shop** (`shop/`, `src/shop/`) is a small made-up shop, Larkfield, with eight AI features: routing a support ticket, reading a review's mood, pulling fields from a receipt, rewriting a product title, summarising a delivery note, working out an invoice total, pulling an address from an email and answering a returns question. Each feature reads its inference mode from Firebase Remote Config and calls Firebase AI Logic in that mode. Every answer carries a badge that says where the SDK reports it ran.

**The check** (`index.html`, `src/check/`) sends each feature 50 inputs through Firebase AI Logic: three times to Chrome's model in device-only mode, once to Gemini in cloud-only mode. It gives each feature one verdict, against a bar the reader sets with a slider: how many wrong answers in 100 the feature can live with. The default is 10. Counts are in inputs, because three runs of one input are not three measurements. Next to each verdict is the range its count allows, and when that range crosses the bar the verdict is marked "Not enough inputs to tell", with about how many more inputs would settle it.

- **Runs on the device:** the platform's own model stays within the bar. Sets `prefer_on_device` for that platform: Chrome on the web for Chrome's model, the iPhone app for Apple's.
- **Keep in the cloud:** only the cloud model stays within it. Sets `only_in_cloud`.
- **Neither model is good enough:** neither stays within it. Change the prompt, or don't use a model for this: work it out in code.
- **Not enough inputs to tell:** fewer than 20 inputs.

The page shows the check as recorded on our laptop, with every wrong answer side by side with the input and the other model's answer. "Run it on your own computer" runs the device side again on yours.

**Apply it**, at the foot of both checks, hands the verdicts over as a Firebase Remote Config template (`src/check/apply.ts`): one parameter for each feature, `only_in_cloud` by default, and `prefer_on_device` under a condition for Chrome on the web for a feature that can run on the device. A verdict holds only on the platform whose model was checked: Chrome's model for "Chrome on the web", Apple's for "The iPhone app". A browser without the model, or an app on any other platform, keeps the default. With it come the app code that reads the modes, for the web and for Swift, one model for each feature with its instruction and answer shape set for both sides, and the `firebase deploy --only remoteconfig` command. The page writes nothing to your project. The sample shop runs on the template the recorded check gives at the default bar.

**The fix step** asks whether one more line in the prompt moves a feature to the device. The cloud model reads the on-device model's wrong answers and proposes one sentence for the end of the instruction, and you can try a line of your own. A line counts only if the on-device model is within the bar with it on the check's inputs and on 10 inputs kept out of the check, with the cloud model still within the bar on those.

A feature that comes within the bar on the device only after a change ships with that change in the same template. Beside `mode_<feature>` sits `line_<feature>`, one more sentence for the end of the instruction, or `steady_<feature>`, which switches the on-device model's randomness off; each is empty or false by default and set under the same platform condition as the mode. Both shops read them with the mode, so a feature moves to the device, and back, with a Remote Config change alone. Where more than one change works, the template takes a setting first, then the cloud model's own line, then one a person wrote. The fix panel marks the one that ships.

**Check your own prompts** (`own/`, `src/own/`) gives the same verdicts for a feature you paste: the instruction your app sends, the shape of the answer and a few inputs. The cloud model writes 30 more inputs from yours, hard ones included, with the right answer where there is one; you tick the ones a real user could send and correct the answers. An input with a right answer is decided by code. One without is judged by the cloud model, and the page says which. One ticked input in four is kept out of the check, so a one-line fix to the prompt is proved on inputs it wasn't written from. Your features and their answers are kept only in your browser.

The cloud side runs on Google's free Gemini tier, which the whole site shares: 15 requests a minute and 500 a day. One feature uses about 30. Google may use what is sent to that tier to improve its products, and the page says so before you paste.

**The inputs and their right answers** are in `src/features/`. Code decides whether an answer is right wherever an input has one right answer: a category, a date, a total, an address, a yes or no. For receipts, invoices and returns questions, the input text and the right answer are built from the same figures, so the key can't disagree with the input. Two features, the product title and the delivery note, have no single right answer. Code checks their rules (length, required details), and the cloud model judges the rest, 25 answers in one request.

**Who checks that judge.** The cloud model's judgment decides those two features' verdicts, and some of the answers it judges are its own. So two more judges look at the same answers without being told which model wrote which. A second model, `gemini-3.8-flash`, judges them again with the same request; the recorder runs it last, as far as its free 20 requests a day go, and the record keeps its judgments beside the first (`second`). And people mark them on a small page (`label/`, `src/label/`): one answer at a time, "good enough" or "not good enough", no grade shown, each answer to one person. Their marks are kept in Cloud Firestore (`firestore.rules`: an answer keeps its first mark, and nothing is changed or removed). The results page shows every judgment beside each answer, and from 30 marks on, how far the cloud model agrees with the people. Neither changes a verdict.

**The iPhone shop** (`ios/`) is the same shop as a SwiftUI app. Firebase AI Logic's hybrid inference for Apple platforms reaches Apple's on-device model through the Foundation Models framework, with Gemini behind it. The app bundles the same instructions, answer shapes and inputs as the web shop (`npm run ios` writes them from `src/features/` into `ios/Larkfield/features.json`), reads each feature's mode, and its line or setting where it has one, from the same Remote Config template under its own condition, "The iPhone app", and badges every answer with where the SDK says it ran. So one feature can run on the device on one platform and in the cloud on the other.

The check has Apple's model as a third column, and the iPhone app runs the check itself. Its Check tab sends every input three times to the on-device model alone and gives each feature its verdict on the phone. The verdicts come from the web check's own code: `npm run ios` builds `src/check/phone.ts` into one script, `ios/Larkfield/check.js`, which the app runs, so both apps count, judge and decide the same way, against the same recorded cloud answers. `npm run apple` puts the app's answers into the record. On the web check, a switch picks the platform the two sides are about.

In the recorded check Apple's model, as written, stays within the default bar on none of the eight features, while Chrome's runs two on the device. With its randomness switched off, Apple's model comes within the bar on the ticket router, on the check's inputs and the held-back ones, so the template runs tickets on the iPhone with `steady_ticket_route`. On Chrome it moves two more with one added line each: the review's mood with the cloud model's own line, and the address with ours.

## The numbers

The results page shows the whole record: every input, its right answer, all three answers from Chrome's model and the cloud model's, each marked right or wrong with the reason, the held-back inputs, and every answer under each one-line fix. `npm run results` prints the same counts from the same file, `src/check/recorded.json`: for each feature and each kind of input, how many runs Chrome's model got right and how many inputs the cloud model did.

## Where Firebase is used

- `src/firebase.ts`: Firebase AI Logic (`firebase/ai`) with the Gemini Developer API, one model for each feature and mode, and App Check with reCAPTCHA Enterprise.
- `src/check/ask.ts`: every request, on the device or in the cloud, and where the SDK says the answer ran.
- `src/shop/main.tsx`: Remote Config holds each feature's mode, and the shop follows a change without a reload.
- `src/labels.ts`: Cloud Firestore keeps people's marks on the judged answers.
- `ios/Larkfield/Ask.swift`: the same request from the iPhone app, through `HybridModel` with Apple's on-device model and Gemini, in the mode `ios/Larkfield/Shop.swift` reads from Remote Config.
- `firebase.json`: Hosting, the Remote Config template and the Firestore rules, deployed with one command.

One thing we learned from the SDK's source: in hybrid mode the request's system instruction and output shape reach only the cloud model. Chrome's model takes them from `onDeviceParams`. `modelFor` in `src/firebase.ts` sets both.

## Run your own copy

You need a Firebase project on the free Spark plan with a web app registered, Firebase AI Logic set up with the Gemini Developer API, and App Check with a reCAPTCHA Enterprise site key for your Hosting domain.

```sh
npm install
echo "VITE_RECAPTCHA_SITE_KEY=<your site key>" > .env.local
npx firebase use <your project id>
npm run deploy
```

`npm run deploy` writes the Remote Config template from the recorded verdicts (`scripts/modes.ts`), builds the pages and deploys Hosting and the Remote Config template. The pages read the project's config from Firebase Hosting at `/__/firebase/init.json`, so no config or key is in this repo.

To record the check on your own machine, add an App Check debug token for your web app to `.env.local` as `VITE_APPCHECK_DEBUG_TOKEN`, start `npm run dev`, start Chrome with `--remote-debugging-port=9222` and run `CDP=http://127.0.0.1:9222 node scripts/record.mjs`. It runs everything Chrome's model has to answer first, which is free, and then the cloud side. The free tier allows 15 cloud requests a minute and 500 a day for the whole project; the recording waits out a full minute, and when the day runs out it stops and keeps what it has in `record.partial.json`. Run it again the next day and it goes on from there. When nothing is missing it writes `src/check/recorded.json`.

### The iPhone app

It needs Xcode 26 and a Mac with Apple Intelligence switched on, because the iPhone simulator answers with the Mac's own model. The simulator's iOS version has to be close to the Mac's macOS version: iOS 26.0 on macOS 26.6 fails every on-device request, iOS 26.5 works (`xcodebuild -downloadPlatform iOS -buildVersion 26.5`). It also needs Swift 6.2.3 or newer: the SDK's hybrid inference for Apple's model is compiled only from that version on. It uses firebase-ios-sdk 12.19.3, the last release with this API for iOS 26.

1. Register an iOS app with the bundle ID `app.deviceorcloud.larkfield` in your Firebase project and save its config as `ios/Larkfield/GoogleService-Info.plist`: `npx firebase apps:sdkconfig IOS <app id> -o ios/Larkfield/GoogleService-Info.plist`. The file is not in this repo.
2. Register an App Check debug token for that app and pass it to the simulator as `FIRAAppCheckDebugToken`.
3. `npm install`, then `npm run ios`: it writes the two files the app bundles and this repo doesn't hold, `ios/Larkfield/features.json` and `ios/Larkfield/check.js`. Run it again after the features or the record change.
4. Open `ios/Larkfield.xcodeproj` and run it on an iPhone simulator, or build it from the command line:

```sh
cd ios && xcodebuild -project Larkfield.xcodeproj -target Larkfield -sdk iphonesimulator \
  -clonedSourcePackagesDirPath build/packages SYMROOT=$PWD/build/target-build OBJROOT=$PWD/build/target-obj \
  ARCHS=arm64 ONLY_ACTIVE_ARCH=NO CODE_SIGN_IDENTITY=- build
```

This builds the target, not the scheme, because a scheme build wants the simulator of Xcode's own iOS version installed, and that may be the one that can't answer.

The app has to be signed, if only for local use as here: an unsigned build can't reach its keychain in the simulator, and then Remote Config and App Check both fail. With Xcode 26.0 or 26.1, whose Swift is older, install the Swift 6.2.3 toolchain from swift.org and put `TOOLCHAINS=<its identifier>` before `xcodebuild`.

`IOS_APPCHECK_DEBUG_TOKEN=<token> node scripts/walk-ios.mjs` walks the built app in the simulator: every feature answers its sample where the template says, and with the app's network cut the device features still answer while the cloud ones say they need a connection. The simulator has no flight mode, so the walk loads `ios/offline/offline.c` into the app to refuse its network connections.

To record Apple's side: launch the app on its Check tab with `-record` (`xcrun simctl launch booted app.deviceorcloud.larkfield -tab check -record`). It answers the check's inputs and the held-back ones, and then tries every line and setting listed in `fixes.json` in its Documents folder. It keeps what it has in `check.json` there. Then `npm run apple -- <that check.json> <a fixes.json to write>` puts Apple's answers into the record and writes the list of what the app should try next, such as a line the cloud model has proposed since. Copy that list into the app's Documents folder and launch it again; run `scripts/record.mjs` again for what the cloud model has not judged yet.

`scripts/walk.mjs` walks the whole path on the live site: the recorded check, a live run, the results page, a feature pasted into "Check your own prompts", every shop feature, and the shop with the network off.

## Licence

Apache 2.0.
