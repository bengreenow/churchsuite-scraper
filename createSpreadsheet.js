const fs = require("fs");

const { google } = require("googleapis");

const keys = require("./credentials.json");

const client = new google.auth.JWT(keys.client_email, null, keys.private_key, [
    "https://www.googleapis.com/auth/spreadsheets",
]);
let rotaData;
client.authorize((err, tokens) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Connected");
        rotaData = JSON.parse(loadData("./rotas.json"));
        gsrun(client);
    }
});

const createServiceHeaders = () => {
    const result = rotaData.map((x) => {
        return [x.serviceName];
    });
    console.log(result);
    return result;
};

const gsrun = async (cl) => {
    const gsapi = google.sheets({ version: "v4", auth: cl });

    const updateOptions = {
        spreadsheetId: "1jZTYClRKTowFPq5FIUNjJ-zpbyeD9LIDAwde4lHCQNE",
        range: "A2",
        valueInputOption: "USER_ENTERED",
        resource: { values: createServiceHeaders() },
    };

    const data = await gsapi.spreadsheets.values.update(updateOptions);
    console.log(data.data);
};

const loadData = (path) => {
    try {
        return fs.readFileSync(path, "utf8");
    } catch (err) {
        console.error(err);
        return false;
    }
};
