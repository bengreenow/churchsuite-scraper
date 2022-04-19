const fs = require("fs");
require("dotenv").config();
const constants = require("./constants.js");

const { google } = require("googleapis");

const keys = require("./credentials.json");

const client = new google.auth.JWT(keys.client_email, null, keys.private_key, [
    "https://www.googleapis.com/auth/spreadsheets",
]);
let rotaData;
client.authorize((err) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Connected");
        rotaData = JSON.parse(loadData("./rotas.json"));
        gsrun(client);
    }
});

const createTable = () => {
    const flattenedRotas = rotaData
        .map((serviceSlot) => {
            return serviceSlot.dates.map((serviceDateRota) => {
                return { ...serviceDateRota, rotaName: serviceSlot.rotaName };
            });
        })
        .flat(2);

    const veryEarlyToday = new Date();
    veryEarlyToday.setHours(0);
    veryEarlyToday.setMinutes(0);
    veryEarlyToday.setSeconds(0);
    const sortedRotas = flattenedRotas
        .sort((a, b) => {
            return Date.parse(a.date) - Date.parse(b.date);
        })
        .filter((x) => {
            const rotaDate = new Date(x.date);
            return rotaDate > veryEarlyToday;
        });

    const allOccurances = {};
    sortedRotas.forEach((rota) => {
        const occurances = {};
        rota.people.forEach((person) => {
            person.roles?.forEach((role) => {
                occurances[role] = occurances[role] ? occurances[role] + 1 : 1;
            });
        });
        Object.entries(occurances).forEach(([key, value]) => {
            allOccurances[key] = allOccurances[key]
                ? Math.max(value, allOccurances[key])
                : value;
        });
    });

    const headerRow = Object.entries(allOccurances)
        .map(([key, value]) => {
            return Array(value).fill(key);
        })
        .flat()
        .sort(
            (a, b) =>
                constants?.idealHeaderOrder.indexOf(a) -
                constants?.idealHeaderOrder.indexOf(b)
        );

    const rotaRows = sortedRotas.map((x) => {
        return [
            new Date(x.date).toLocaleString("en-US", {
                hour12: true,
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
            }),
            ...createRotaRow(x.people, headerRow),
        ];
    });
    const finalTable = [[undefined, ...headerRow], ...rotaRows];
    return finalTable;
};

const createRotaRow = (peopleArray, headerRow) => {
    const roleSet = new Set(headerRow);
    const roleIndexCounter = {};
    roleSet.forEach((role) => {
        roleIndexCounter[role] = headerRow.findIndex((x) => x === role);
    });
    const rotaRow = Array(headerRow.length).fill("");
    peopleArray.forEach((person) => {
        const nameSplit = person.name?.split(" ");
        const shortName = person.name
            ? `${nameSplit[0]} ${nameSplit[nameSplit.length - 1][0]}`
            : "";

        person.roles?.forEach((role) => {
            const columnIndex = roleIndexCounter[role];
            rotaRow[columnIndex] = shortName;
            roleIndexCounter[role] = roleIndexCounter[role] + 1;
        });
    });
    return rotaRow;
};

const gsrun = async (cl) => {
    const gsapi = google.sheets({ version: "v4", auth: cl });
    const updateOptions = {
        spreadsheetId: process.env.SHEET_ID,
        range: "A1",
        valueInputOption: "USER_ENTERED",
        resource: { values: createTable() },
    };
    const data = await gsapi.spreadsheets.values.update(updateOptions);
};

const loadData = (path) => {
    try {
        return fs.readFileSync(path, "utf8");
    } catch (err) {
        console.error(err);
        return false;
    }
};
