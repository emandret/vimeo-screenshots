'use strict';

const fs = require('fs');
const process = require('process');
const fetch = require('node-fetch');
const puppeteer = require('puppeteer-core');

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
}

(async () => {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.warn('Please specify a valid Vimeo video ID and a time interval!');
        process.exit();
    }

    try {
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            ignoreDefaultArgs: ['--disable-dev-shm-usage']
        })

        const id = parseInt(args[0]);
        const interval = parseInt(args[1]);
        const video = await fetchVideoData(id);

        // Current working directory
        const cwd = process.cwd();
        const imgPath = `${cwd}/video_${id}`;

        // Create the folder if not existing
        if (!fs.existsSync(imgPath)) {
            fs.mkdirSync(imgPath);
        }

        for (let t = 0; t < video.duration;) {
            const page = await browser.newPage();

            // Set the viewport width and height
            await page.setViewport({ width: video.width, height: video.height });

            // Open the player
            await page.goto(`file://${cwd}/player.html#v=${id}&t=${Math.round(t)}`, { waitUntil: 'networkidle0', timeout: 0 });

            // Start time counter
            const start = process.hrtime();

            // Screenshot the viewport
            await page.screenshot({ path: `${imgPath}/x.jpeg`, type: 'jpeg', quality: 100, clip: { x: 0, y: 0, width: video.width, height: video.height } });

            // Compute delta time
            const diff = process.hrtime(start);
            t += (diff[0] + diff[1] * 1e-9);
            t += interval;

            // Convert the number of seconds to hh:mm:ss
            const date = new Date(Math.round(t) * 1e3).toISOString().substr(11, 8).replace(/\:/g, '');

            // Rename the screenshot
            fs.rename(`${imgPath}/x.jpeg`, `${imgPath}/img_${date}.jpeg`, (e) => {
                if (e) {
                    console.warn(e);
                } else {
                    console.log(`Saved img_${date}.png!`);
                }
            });

            await page.close();
        }

        await browser.close();
    }
    catch (e) {
        console.warn(e);
    }
})();
