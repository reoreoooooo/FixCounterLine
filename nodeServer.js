import fetch from "node-fetch";
import path from "path";
import express from "express";
import formData from "express-form-data";


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
  let buf = base64ToBuffer(req.body["imgData"]);
  let csv = stringToCsv(req.body["coresCsvData"]);
  uploadImg(buf, csv);
  res.send("Received POST Data!");
});

app.listen(5000, function () {
  console.log('Your local server listening on port 5000!');
});

function base64ToBuffer(body) {
  let eliminatedBody = body.split(",")[1]
  let imageBuf = Buffer.from(eliminatedBody, "base64");
  return imageBuf;
}

function stringToCsv(body) {
  let csvArray = body.split(",");
  return csvArray;
}


function uploadImg(imgData, coresCsvData) {

  const url = "https://mds.meatimage.jp/api/beef/image/__auto__/input.jpg?";
  const token = "36a55dc836176b49562c0f3a4b0d2f20709af9b9";

  let params = {
    method: "PUT",
    headers: {
      "Content-Type": "image/png",
      "Authorization": `Token ${token}`
    },
    body: imgData
  }

  // [0]: Owner, [1]: TakenAt, [2]: BarcodeNo, [3]: BodyNo
  let barcode = coresCsvData[2];
  let bodyno = coresCsvData[3];
  let takenat = coresCsvData[1];
  let owner = coresCsvData[0];

  console.log("----------");
  console.log(barcode);
  console.log(bodyno);
  console.log(takenat);
  console.log(owner);

  let p = {
    "barcode_no" : barcode,
    "body_no" : bodyno,
    "taken_at" : takenat,
    "owner" : owner,
    "do_analysis" : "True",
    "ppmm" : "10"
  };
  let query = new URLSearchParams(p);
  
  fetch(url+`${query}`, params).then(response => {
    console.log(response.statusText);
  });
}
