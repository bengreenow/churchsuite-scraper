require("dotenv").config();
const puppeteer = require("puppeteer");
const HTMLParser = require("node-html-parser");

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
    console.log("Navigated to page");

    await page.keyboard.type(process.env.USERNAME);
    await Promise.all([
        page.keyboard.press("Enter"),
        page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);
    console.log("Username ✅");

    await page.keyboard.type(process.env.PASSWORD);
    await Promise.all([
        page.keyboard.press("Enter"),
        page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);
    console.log("Password ✅");

    await page.goto(
        `https://${process.env.TENET_NAME}.churchsuite.com/my/rotas`
    );

    const rotas = await page.$$(".my-rotas > .ca-panel-tbl > .tbl-row");

    await Promise.all([rotas[0].click(), page.waitForSelector(".rota")]);
    await page.waitForSelector(".rota-date[data-dateid]");

    const rotaElements = await page.$$(".rota-date[data-dateid]");

    const rotaHTML = rotaElements.map(async (rota) => {
        return await rota.evaluate((el) => {
            return {
                date: el.getAttribute("data-datename"),
                html: el.innerHTML,
            };
        });
    });
    const htmlText = await Promise.all(rotaHTML);

    console.log(parse(htmlText));

    await page.screenshot({ path: "example.png" });

    await browser.close();
})();

/**
 * @param  {{html: string, date:string}[]} strings A list of HTML Strings and dates to parse
 */
const parse = (strings) => {
    const HTMLObjects = strings.map((x) => {
        const dom = HTMLParser.parse(x.html);
        return { ...x, html: dom };
    });

    return HTMLObjects.map((x) => {
        const roles = x.html.querySelectorAll("[data-personid]").map((y) => {
            return {
                personId: y.getAttribute("data-personid"),
                roles: y.querySelector(".roles").textContent.split(", "),
                name: removeTabsAndNewlines(
                    y.querySelector(".profile-name").textContent
                ),
                status: y
                    .querySelector(".profile-name")
                    .getAttribute("data-status"),
                // .getAttribute("data-status"),
            };
        });
        return {
            date: x.date,
            roles,
        };
    });
};

const removeTabsAndNewlines = (string) => {
    return string.replace(/(\r\n|\n|\r|\t)/gm, "");
};
