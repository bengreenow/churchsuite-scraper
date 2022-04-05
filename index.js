require("dotenv").config();
const puppeteer = require("puppeteer");

(async () => {
    const browser = await puppeteer.launch({});
    const page = await browser.newPage();
    await page.setViewport({ height: 1000, width: 1920 });
    await page.goto("https://login.churchsuite.com/");

    // await enterAndWait(page);
    await page.keyboard.type(process.env.TENET_NAME);
    await Promise.all([
        page.keyboard.press("Enter"),
        page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);

    await page.keyboard.type(process.env.USERNAME);
    await Promise.all([
        page.keyboard.press("Enter"),
        page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);

    await page.keyboard.type(process.env.PASSWORD);
    await Promise.all([
        page.keyboard.press("Enter"),
        page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);

    await page.goto(
        `https://${process.env.TENET_NAME}.churchsuite.com/my/rotas`
    );

    const rotas = await page.$$(".my-rotas > .ca-panel-tbl > .tbl-row");

    await Promise.all([rotas[0].click(), page.waitForSelector(".rota")]);
    await page.waitForSelector(".rota-date[data-dateid]");

    const rotaElements = await page.$$(".rota-date[data-dateid]");

    rotaElements.forEach((rota) => {
        //todo: grab each rota's details,
    });

    await page.screenshot({ path: "example.png" });

    await browser.close();
})();

const enterAndWait = async (page) => {
    Promise.all([
        page.keyboard.press("Enter"),
        page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);
};
