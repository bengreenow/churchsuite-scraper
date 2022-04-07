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

    await page.keyboard.type(process.env.CHURCHSUITE_USERNAME);
    await Promise.all([
        page.keyboard.press("Enter"),
        page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);
    console.log("Username ✅");

    await page.keyboard.type(process.env.CHURCHSUITE_PASSWORD);
    await Promise.all([
        page.keyboard.press("Enter"),
        page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);
    console.log("Password ✅");

    // todo loop over all rotas
    await page.goto(
        `https://${process.env.TENET_NAME}.churchsuite.com/my/rotas`
    );

    const rotas = await page.$$(".my-rotas > .ca-panel-tbl > .tbl-row");
    const rotaCount = rotas.length;

    const allRotas = [];
    for (let i = 0; i < rotaCount; i++) {
        const rotas = await page.$$(".my-rotas > .ca-panel-tbl > .tbl-row");

        await Promise.all([rotas[i].click(), page.waitForSelector(".rota")]);
        console.log(`Rota Clicked ${i + 1} ✅`);

        await page.waitForSelector(".rota-date[data-dateid]");
        const rotaElements = await page.$$(".rota-date[data-dateid]");
        console.log(`Rota ${i + 1} loaded ✅`);

        const rotaHTML = rotaElements.map(async (rota) => {
            return await rota.evaluate((el) => {
                return {
                    date: new Date(
                        el
                            .getAttribute("data-datename")
                            .replace(/(am|pm|AM|PM)/g, " $1") // add space before am / pm so JS can parse
                    ),
                    html: el.innerHTML,
                };
            });
        });
        const htmlText = await Promise.all(rotaHTML);

        const currentRota = {
            rotaName: await rotas[i].evaluate(async (el) => {
                return el.querySelector("a[href]").textContent;
            }),
            rotaId: await rotas[i].evaluate(async (el) => {
                return el
                    .querySelector("a[href]")
                    .getAttribute("href")
                    .replace("/my/rotas/", "");
            }),
            dates: parse(htmlText),
        };

        allRotas.push(currentRota);

        // go back to rotas
        await page.goto(
            `https://${process.env.TENET_NAME}.churchsuite.com/my/rotas`
        );
        await page.screenshot({ path: `beforegoto${i}.png` });
        console.log(`Back to rotas page ✅`);
    }

    const fs = require("fs");

    const storeData = (data, path) => {
        try {
            fs.writeFileSync(path, JSON.stringify(data));
        } catch (err) {
            console.error(err);
        }
    };

    storeData(allRotas, "allrotas.json");

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
            // console.log(y.querySelector(".profile-name"));
            return {
                personId: y.getAttribute("data-personid"),
                roles: y.querySelector(".roles")?.textContent.split(", "),
                name: removeTabsAndNewlines(
                    y.querySelector(".profile-name")?.textContent
                ),
                status: y
                    .querySelector(".profile-name")
                    ?.getAttribute("data-status"),
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
    if (!string) {
        return string;
    }
    return string.replace(/(\r\n|\n|\r|\t)/gm, "");
};
