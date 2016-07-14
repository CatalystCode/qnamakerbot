# airbots
Repo for ongoing work with customer


### trying QnA Maker Client Locally

```
cd qnamaker-testapp
npm install
npm start
```

### BOT entry point

Bot is defined in app.js.

Do a npm install --no-optional which will install two main dependencies which are restify and botbuilder.

Set appid and password on command line. Check app.js for exact names.

Then just node app.js or npm start should start application on port 3978.

You can use bot framework emulator(on windows) or mono emulator on macos to communicate with the bot.