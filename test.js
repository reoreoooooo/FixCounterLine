import fetch from "node-fetch";
import http from "http";
import * as fs from "fs";
import path from "path";
import express from "express";
import bodyParser from "body-parser";
import formData from "express-form-data";
import dirname from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname).slice(1);

let app = express();

app.use(express.static(__dirname));

// Express-Form-Dataの初期化
const updir = path.dirname(__dirname).replace(/\\/g, "/") + "/tmp"; 
app.use(formData.parse({uploadDir:updir, autoClean:true, maxFieldsSize:"50mb"}));



app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/imgFormed', (req, res) => {
  uploadImg(req.body["imgData"], req.body["coresCsvData"]);

  res.send("Received POST Data!");
});

app.listen(5000, function () {
  console.log('Your local server listening on port 5000!');
});


function uploadImg(imgData, coresCsvData) {

    const url = "https://mds.meatimage.jp/api/beef/image/__auto__/input.jpg?";
    const token = "36a55dc836176b49562c0f3a4b0d2f20709af9b9";

    let params = {
      method: "PUT",
      headers: {
        "Content-Type": "image/jpeg",
        "Authorization": `Token ${token}`
      },
      body: imgData
    }

    // [0]: Owner, [1]: TakenAt, [2]: BarcodeNo, [3]: BodyNo
    let barcode = coresCsvData[2];
    let bodyno = coresCsvData[3];
    let takenat = coresCsvData[1];
    let owner = coresCsvData[0];

    let p = {
      "barcode_no" : barcode,
      "body_no" : bodyno,
      "taken_at" : takenat,
      "owner" : "kuchida",
      "do_analysis" : "True",
      "ppmm" : "10"
    };
    let query = new URLSearchParams(p);
    
    fetch(url+`${query}`, params).then(response => {
      console.log(response);
    });
  }
