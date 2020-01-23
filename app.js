//ExpressJS imports
const express = require('express');
const app = express();
const path = require("path");

//Imports module imports from spreadsheet.js
const sheet = require("./spreadsheet.js");

//Allows parsing of data in requests
app.use(express.urlencoded({extended: true}));
app.use(express.json());

//Serves static file like local js and css
app.use("/static", express.static(path.resolve(__dirname, "public")));

//Sends html file when the page is accessed
app.get("/", (req, res) => {
	res.sendFile(path.resolve(__dirname, "views/index.html"));
});

app.post("/", (req, res) => {
	//sheet.pasteName();
	const info = req.body;

	//Invalid Request error on empty POST request
	if(Object.entries(info).length === 0 && info.constructor === Object)
	{
		//Unprocessable Entity
		res.sendStatus(422);
	}
	else if(info.id)
	{
		//Runs if we are retrieving spreadsheet form
		sheet.getHeaders(info.id).then(headers => {
			//console.log(headers);
			//returns the headers to site as a json file to be parsed
			res.json(headers);
		},
		err => {
			//Unprocessable Entity - caused usually by invalid spreadsheet ids
			console.log(`Error: ${err}`);
			res.sendStatus(422);
		});
	}
	else
	{
		//Submitting data
		//console.log(info);
		sheet.newRow(info).then(output => {
			console.log(output);
		},
		err => {
			console.log(`Error while adding rows: ${err}`);
		});
		res.send("Success\n" + JSON.stringify(info));
	}
});

app.listen(8080);
