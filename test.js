import fetch from "node-fetch";
import http from "http";
import * as fs from "fs";
import path from "path";
import express from "express";
import dirname from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname).slice(1);

let app = express();
app.use(express.static(__dirname));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.listen(5000, function () {
  console.log('Example app listening on port 5000!');
});


function uploadImg(imgData) {
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

    let p = {
      "barcode_no" : "1",
      "body_no" : "1",
      "taken_at" : "2022-01-11T23%3A50%3A00%2B09%3A00",
      "owner" : "kuchida",
      "do_analysis" : "True",
      "ppmm" : "10"
    };
    let query = new URLSearchParams(p);
    
    fetch(url+`${query}`, params).then(response => {
      console.log(response);
    });
  }
