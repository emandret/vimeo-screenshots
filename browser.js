"use strict";

const fs = require("fs");
const process = require("process");
const fetch = require("node-fetch");
const puppeteer = require("puppeteer-core");

async function fetchVideoData(id) {
  try {
    const response = await fetch(`https://vimeo.com/api/v2/video/${id}/json`);
    if (response.status === 200) {
      return (await response.json())[0];
    } else {
      throw new Error(response.status.toString());
    }
  } catch (e) {
    console.warn(e);
  }

  return {}; // Error
}

async function openPageAndScreenshot(viewportWidth, viewportHeight, pageUrl, filePath) {
  const page = await browser.newPage();
  await page.setViewport({ width: viewportWidth, height: viewportHeight });
  await page.goto(pageUrl, { waitUntil: "networkidle0", timeout: 0 }); // TODO: Change the player file with the bundled Vimeo SDK to tweak the progress in milliseconds
  await page.screenshot({
    path: filePath,
    type: "jpeg",
    quality: 100,
    clip: { x: 0, y: 0, width: viewportWidth, height: viewportHeight },
  });
  await page.close();
}

(async () => {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.warn("Please specify a valid Vimeo video ID and a time interval!");
    process.exit();
  }

  const id = parseInt(args[0]);
  const interval = parseInt(args[1]);

  if (interval < 1) {
    console.warn("The time interval must be greater than zero!");
    process.exit();
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      ignoreDefaultArgs: ["--disable-dev-shm-usage"],
    });
    const video = await fetchVideoData(id);

    const cwd = process.cwd();
    const saveDir = `${cwd}/video_${id}`;

    // Create the folder if not existing
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir);
    }

    // Array of promises
    const screenshots = [];
    for (let t = 0; t < video.duration; t += interval) {
      const url = `file://${cwd}/player.html#v=${id}&t=${Math.round(t)}`;
      const date = new Date(Math.round(t) * 1e3).toISOString().substr(11, 8).replace(/\:/g, "");
      const filePath = `${saveDir}/img_${date}.jpeg`;

      // All the asynchronous operations are immediately started
      screenshots.push(openPageAndScreenshot(video.width, video.height, url, filePath));
    }
    // Wait for all promises to resolve
    await Promise.all(screenshots);

    await browser.close();
  } catch (e) {
    console.warn(e);
  }
})();
