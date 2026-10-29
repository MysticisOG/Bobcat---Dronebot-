require("dotenv").config();
const { App } = require("@slack/bolt");
const Parser = require("rss-parser");

const parser = new Parser();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

// Map of YouTube channels to track
const trackedChannels = {
  "MKBHD": { id: "UCBJycsmduvYEL83R_U4JcqQ", lastVideo: "" },
  "JoshuaBardwell": { id: "UC3ioIOr3tH6Yz8qzr418R-g", lastVideo: "" }
};

// Target Slack channel ID where automatic YouTube notifications will post
const ALERT_CHANNEL_ID = "C0123456789"; // TODO: replace with real channel ID later

// Periodic feed checker
async function checkYouTube() {
  for (const [name, data] of Object.entries(trackedChannels)) {
    try {
      const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${data.id}`);
      if (feed.items && feed.items.length > 0) {
        const latest = feed.items[0];
        
        // console.log("checking feed for:", name); // debug
        
        if (data.lastVideo && data.lastVideo !== latest.link) {
          await app.client.chat.postMessage({
            channel: ALERT_CHANNEL_ID,
            text: `📢 *${name}* uploaded a new video!\n${latest.title}\n${latest.link}`
          });
        }
        trackedChannels[name].lastVideo = latest.link;
      }
    } catch (err) {
      console.error(`Error checking ${name}:`, err.message);
    }
  }
}

// 1. /bobcat-summon
app.command("/bobcat-summon", async ({ command, ack, respond }) => {
  const start = Date.now();
  await ack();
  const latency = Date.now() - start;
  await respond({ text: `🐾 *Bobcat is active!* \n Latency: ${latency}ms` });
});

// 2. /bobcat-drone
app.command("/bobcat-drone", async ({ command, ack, respond }) => {
  await ack();
  const input = command.text.trim().toLowerCase();

  switch (input) {
    case "fpv":
      await respond({
        text: "*5-Inch FPV Build*\n• Frame: SpeedyBee Master 5 v2\n• Stack: SpeedyBee F405 V4 55A\n• Motors: EMAX ECO II 2207 1900KV\n• RX: ExpressLRS 2.4GHz"
      });
      break;
    case "budget":
      await respond({
        text: "*Budget Starter Build*\n• Frame: Mark4 5 Inch\n• Stack: F405 V3\n• Motors: Readytosky 2205 2300KV\n• VTX: Eachine TX805"
      });
      break;
    case "cinematic":
      await respond({
        text: "*Cinematic Build*\n• Frame: SpeedyBee Bee35\n• FC: AIO F722 35A\n• Video: DJI O3 Air Unit\n• Motors: 1804 3500KV"
      });
      break;
    default:
      await respond({
        text: "Usage: `/bobcat-drone fpv`, `/bobcat-drone budget`, or `/bobcat-drone cinematic`"
      });
      break;
  }
});

// 3. /bobcat-yt
app.command("/bobcat-yt", async ({ command, ack, respond }) => {
  await ack();
  const text = command.text.trim().toLowerCase();
  
  if (text === "list") {
    const list = Object.keys(trackedChannels).map(ch => `• ${ch}`).join("\n");
    await respond({ text: `*Tracked Channels:*\n${list}` });
  } else {
    await respond({ text: "Use `/bobcat-yt list` to view active YouTube feeds." });
  }
});

(async () => {
  await app.start();
  console.log("Bobcat bot is runnin!"); // slight casual typo

  // Check YouTube feeds every 2.5 mins
  setInterval(checkYouTube, 300000);
})();