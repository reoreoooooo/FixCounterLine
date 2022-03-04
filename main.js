window.addEventListener('load', () => {
  const operatingButton = "Mouse"
  // const operatingButton = "Pentab"

  const clearButton = document.querySelector('#clear-button');
  const downloadButton = document.querySelector('#download-button');
  const imgForwardButton = document.querySelector('#img-forward-button');
  const imgBackwardButton = document.querySelector('#img-backward-button');
  const counter = document.querySelector("#counter");
  const relativePathDiplay = document.querySelector('#relative-path');
  const fileInput = document.getElementById('file');
  const csvInput = document.getElementById('csv');
  let imgCount = 0;
  
  let canvasWidth = 2200;
  let canvasHeight = 1800;

  const canvas = document.querySelector('#preview-draw-area');
  const context = canvas.getContext('2d');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  let ribeyeCanvas = document.querySelector('#ribeye-area');
  let ribeyeContext = ribeyeCanvas.getContext('2d');
  ribeyeCanvas.width = canvasWidth;
  ribeyeCanvas.height = canvasHeight;

  let ribeyeConterCanvas = document.querySelector('#ribeye-contour-area');
  let ribeyeConterContext = ribeyeConterCanvas.getContext('2d');
  ribeyeConterCanvas.width = canvasWidth;
  ribeyeConterCanvas.height = canvasHeight;

  let initPreviewCanvas = document.querySelector('#init-preview-area');
  let initPreviewContext = initPreviewCanvas.getContext('2d');
  initPreviewCanvas.width = canvasWidth;
  initPreviewCanvas.height = canvasHeight;

  let oriCrossSectionImg = new Image();
  let cvOriCrossSectionImg = cv.Mat.ones(canvasHeight, canvasWidth, cv.CV_8UC3);
  let preCrossSectionImg = cv.Mat.ones(canvasHeight, canvasWidth, cv.CV_8UC3);
  let preRibeyeImg = cv.Mat.ones(canvasHeight, canvasWidth, cv.CV_8UC3);
  let oriRibeyeImg = new Image();
  let oriPreviewImg = new Image();

  let loadedPathAndImgList = [];
  let csvData = [];
  // [0]: Owner, [1]: TakenAt, [2]: BarcodeNo, [3]: BodyNo

  let isStartInsideMask = false;
  let isEndInsideMask = false;
  let isCrossedMask = false;
  let isChangedContour = false;
  let isAbleToUpload = false;

  // 始点、終点、現在点のマウスのcanvas上のxy座標
  const startPosition = {x: null, y: null};
  const endPosition = {x: null, y: null};
  const nowPosition = {x: null, y: null};
  
  // マウスがドラッグされているか判断するためのフラグ
  let isDrag = false;
  let isLoadedImage = false;
  
  // 絵を書く
  function boundaryChangeDraw(x, y) {
    // ドラッグしながらしか絵を書くことが出来ない。imageを読み込んでいないと書けない
    if(!isDrag || !isLoadedImage) {
      return;
    }
  
    // context.moveToで設定した位置から、context.lineToで設定した位置までの線を引く。
    if (nowPosition.x === null || nowPosition.y === null) {
      context.moveTo(x, y);
      ribeyeContext.moveTo(x, y);
    } else {
      context.moveTo(nowPosition.x, nowPosition.y);
      ribeyeContext.moveTo(nowPosition.x, nowPosition.y);
    }
    context.lineTo(x, y);
    ribeyeContext.lineTo(x, y);
    context.stroke();
    ribeyeContext.stroke();
  
    // 現在のマウス位置を記録して、次回線を書くときの開始点に使う
    nowPosition.x = x;
    nowPosition.y = y;
  }

  function saveToLocalStoreage() {
    preRibeyeImg.delete();
    preRibeyeImg = cv.imread("ribeye-area");
    preCrossSectionImg.delete();
    preCrossSectionImg = cv.imread("preview-draw-area");
 }

  // Canvasを戻す
  function prevCanvas() {
    cv.imshow("ribeye-area", preRibeyeImg);
    cv.imshow("preview-draw-area", preCrossSectionImg);
  }

  function clearExceptImg() {
    MODEChangeToInit();
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(oriCrossSectionImg, 0, 0, canvasWidth, canvasHeight);
    ribeyeContext.clearRect(0, 0, canvasWidth, canvasHeight);
    ribeyeContext.drawImage(oriRibeyeImg, 0, 0, canvasWidth, canvasHeight);
    changeBoundary();
    saveToLocalStoreage();
  }

  function imgForward() {
    MODEChangeToInit();
    imgCount++;
    imgForwardButton.disabled = true;
    imgBackwardButton.disabled = true;
    isChangedContour = false;
    setImages(loadedPathAndImgList[imgCount]);
  }

  function imgBackward() {
    MODEChangeToInit();
    imgCount--;
    imgForwardButton.disabled = true;
    imgBackwardButton.disabled = true;
    isChangedContour = false;
    setImages(loadedPathAndImgList[imgCount]);
  }

  function checkImgbtnEnable(imgCount) {
    if (imgCount <= 0) {
      imgBackwardButton.disabled = true;
      imgForwardButton.disabled = false;
    } else if (imgCount >= loadedPathAndImgList.length - 1) {
      imgBackwardButton.disabled = false;
      imgForwardButton.disabled = true;
    } else {
      imgBackwardButton.disabled = false;
      imgForwardButton.disabled = false;
    }
  }

  function arrangeCanvasSize(width, height) {
    canvasWidth = width;
    canvasHeight = height;
    canvas.width = width;
    canvas.height = height;
    ribeyeCanvas.width = width;
    ribeyeCanvas.height = height;
    initPreviewCanvas.width = width;
    initPreviewCanvas.height = height;
  }

  // Preview => Ribeye => CrossSection の順で読み込む
  // onloadの特性上、入れ子構造にしてしまっているので注意
  // setTimeoutがsetImagesの最終実行地点
  function setImages(dataAndPaths) {
    let reader = new FileReader;

    reader.readAsDataURL(dataAndPaths[2][0]);
    reader.onload = function() {
      oriPreviewImg.src = reader.result;
      oriPreviewImg.onload = function() {
        arrangeCanvasSize(this.width, this.height);
        // canvas内の要素をクリアして、画像を描画。imagedataを取得
        initPreviewContext.clearRect(0, 0, canvasWidth, canvasHeight);
        initPreviewContext.drawImage(oriPreviewImg, 0, 0, canvasWidth, canvasHeight)
        setRibeyeImage(dataAndPaths);
      }
    }
  }

  function setRibeyeImage(dataAndPaths) {
    let reader = new FileReader;
      
    reader.readAsDataURL(dataAndPaths[1][0]);
    reader.onload = function() {
      oriRibeyeImg.src = reader.result;
      oriRibeyeImg.onload =  function() {
        // canvas内の要素をクリアして、画像を描画。imagedataを取得
        ribeyeContext.clearRect(0, 0, canvasWidth, canvasHeight);
        ribeyeContext.drawImage(oriRibeyeImg, 0, 0, canvasWidth, canvasHeight)
        setCrossSectionImage(dataAndPaths);
        counter.textContent = String(imgCount + 1) + "/" + String(loadedPathAndImgList.length) 
      };
    };
  }

  function setCrossSectionImage(dataAndPaths) {
    let reader = new FileReader();

    reader.readAsDataURL(dataAndPaths[0][0]);
    reader.onload =  function() {
      oriCrossSectionImg.src = reader.result;
      oriCrossSectionImg.onload = function() {
        // canvas内の要素をクリアして、画像を描画。imagedataを取得
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.drawImage(oriCrossSectionImg, 0, 0, canvasWidth, canvasHeight);
        relativePathDiplay.textContent = dataAndPaths[0][1];
        cvOriCrossSectionImg.delete();
        cvOriCrossSectionImg = cv.imread("preview-draw-area");
        changeBoundary()
        saveToLocalStoreage();
        setTimeout(checkImgbtnEnable, 1000, imgCount);
      };
    };
  }

  function isInsideMask(x, y) {
    let r = preRibeyeImg.ucharPtr(y, x)[0];
    let g = preRibeyeImg.ucharPtr(y, x)[1];
    let b = preRibeyeImg.ucharPtr(y, x)[2];

    if (r == 255 && g == 255 && b == 255) {
      return true;
    } else {
      return false;
    }
  }

  function changeBoundary() {
    let ori4 = cvOriCrossSectionImg.clone();
    let ori3 = cv.Mat.ones(canvasHeight, canvasWidth, cv.CV_8UC3);
    let ribeyeOri = cv.imread("ribeye-area");
    let ribeyeOriGray = new cv.Mat();
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    let maskResult = cv.Mat.ones(canvasHeight, canvasWidth, cv.CV_8UC3);　// opencvでは(縦, 横)になることに注意
    let maxArea = 0;
    let maxAreaIndex = 0;

    cv.cvtColor(ribeyeOri, ribeyeOriGray, cv.COLOR_RGBA2GRAY, 0);
    cv.findContours(ribeyeOriGray, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE, new cv.Point(0, 0));
    //　一番大きな多角形を取得
    for (let i = 0; i < contours.size(); i++) {
      let cnt = contours.get(i);
      let area = cv.contourArea(cnt, false);
      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = i;
      }
    }

    cv.drawContours(maskResult, contours, maxAreaIndex, new cv.Scalar(255, 255, 255), cv.FILLED);
    cv.imshow("ribeye-area", maskResult);
    
    cv.cvtColor(ori4, ori3, cv.COLOR_RGBA2RGB); //8UC4 -> 8UC3への変更。imreadすると8UC4に勝手に変換されてしまう。
    cv.drawContours(ori3, contours, maxAreaIndex, new cv.Scalar(0, 255, 0), 3);

    cv.imshow("preview-draw-area", ori3);
    ori4.delete();
    ori3.delete();
    ribeyeOri.delete();;
    ribeyeOriGray.delete();
    hierarchy.delete();
    maskResult.delete();
    contours.delete();
  }

  function MODEChangeToEdit() {
    initPreviewCanvas.style.display = "none";
    canvas.style.display = "block";
  }

  function MODEChangeToInit() {
    initPreviewCanvas.style.display = "block";
    canvas.style.display = "none";
  }
  
  // 「context.beginPath()」と「context.closePath()」を都度draw関数内で実行するよりも、
  // 線の描き始め(dragStart関数)と線の描き終わり(dragEnd)で1回ずつ読んだほうがより綺麗に線画書ける
  // 右クリックのmousedownの場合returnさせる
  // 左クリック event.button == 0, 右クリック event.button == 2
  function dragStart(event) {
    event = event || window.event;
    if (operatingButton == "Mouse") {
      if (event.button == 2) {
        console.log("右クリック　mousedown");
        return
      }
      console.log("左クリック　mousedown");
    } else if (operatingButton == "Pentab") {
      if (event.button == 0) {
        console.log("左クリック　mousedown");
        return
      }
      console.log("右クリック　mousedown");
    }

    let x = event.pageX - canvas.offsetLeft;
    let y = event.pageY - canvas.offsetTop;

    context.beginPath();
    ribeyeContext.beginPath();
    isDrag = true;
    isStartInsideMask = isInsideMask(x, y);

    startPosition.x = x;
    startPosition.y = y;
    MODEChangeToEdit();
  }

  function dragEnd(event) {
    // 左クリックのmousedownの場合returnさせる
    event = event || window.event;
    if (operatingButton == "Mouse") {
      if (event.button == 2) {
        console.log("右クリック　mousedown");
        return
      }
      console.log("左クリック　mousedown");
    } else if (operatingButton == "Pentab") {
      if (event.button == 0) {
        console.log("左クリック　mousedown");
        return
      }
      console.log("右クリック　mousedown");
    }
    
    if (!isDrag) {
      return;
    }

    let x = event.pageX - canvas.offsetLeft;
    let y = event.pageY - canvas.offsetTop;

    context.closePath();
    ribeyeContext.closePath();
    isEndInsideMask = isInsideMask(x, y);

    endPosition.x = x;
    endPosition.y = y;

    let isAddArea = isInsideMask(startPosition.x, startPosition.y) && isInsideMask(endPosition.x, endPosition.y);
    let isClipArea =  !isInsideMask(startPosition.x, startPosition.y) && !isInsideMask(endPosition.x, endPosition.y);
    // 内→外もしくは外→内　になった時のみpreCanvesを動作させる。
    if (!(isAddArea || isClipArea) || (isClipArea && !(isCrossedMask))) {
      prevCanvas();
    } else {
      changeBoundary();
      saveToLocalStoreage();
    }

    // 描画中に記録していた値をリセットする
    nowPosition.x = null;
    nowPosition.y = null;

    isDrag = false;
    isCrossedMask = false;
  }

  function saveToFile(fileName, imgData) {
    var a = document.createElement("a");
    a.href = imgData
    //a.target   = '_blank';
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

  function uploadImg(imgData, coresCsvData) {
		let formDatas = new FormData();
		formDatas.append("imgData",  imgData);
		formDatas.append("coresCsvData",  coresCsvData);

    fetch('imgFormed', {method:"POST", body:formDatas})
    .then(res => console.log(res.text()))
    .then(text => console.log(text))
    .catch(err =>console.log(err.message));
  }


  function csvTakenAtToFilenameTakenAt(csvTakenAt) {
    // csvTakenAt 2022-02-07 05:43:12+09:00 -> +09:00は無視すると日本時間になる
    // filenameTakenAt 20210815232725 -> これは日本時間

    let dt = new Date(csvTakenAt);

    // DateをYYYYMMDDHHMMSSの書式で返す
    let y = dt.getFullYear();
    let mon = ('00' + (dt.getMonth()+1)).slice(-2);
    let d = ('00' + dt.getDate()).slice(-2);
    let h = ('00' + dt.getHours()).slice(-2);
    let mi = ('00' + dt.getMinutes()).slice(-2);
    let s = ('00' + dt.getSeconds()).slice(-2);

    return (y + mon + d + h + mi + s);
  }


  function checkCorrespondCsvData(path, filename) {
    for (let i = 0; i < csvData.length; i++) {
      let isTakenAtCorrect = (csvTakenAtToFilenameTakenAt(csvData[i][1]) == filename.split("_")[0]);
      let isBarcodeCorrect = (csvData[i][2] == filename.split("_")[1]);
      if (isTakenAtCorrect && isBarcodeCorrect) {
        coresTakenat = csvData[i][1];
        coresBodynum = csvData[i][3];
        coresOwner = csvData[i][0];

        barcode = filename.split("_")[1];

        return [coresOwner, coresTakenat, barcode, coresBodynum];
      } 
    }

    return null;
  }

  function downloadImg() {
    let imgData = canvas.toDataURL("image/png");
    // path = 20210817-153843_Irongate/cross_section/20210815232725_0199333837010053310201982011210813211026212128.jpg
    // name = 20210815232725_0199333837010053310201982011210813211026212128.jpg
    // filename = 20210815232725_0199333837010053310201982011210813211026212128
    let path =  loadedPathAndImgList[imgCount][0][1];
    let name = path.split("/")[2];
    let filename = name.substr(0, name.length-4);
   
    saveToFile(filename+".png", imgData);

    // これをパスにする
    let coresCsvData = checkCorrespondCsvData(path, filename);
    if (coresCsvData != null && isAbleToUpload == true) {
      uploadImg(imgData, coresCsvData);
    }
    
    if (imgCount < loadedPathAndImgList.length - 1) {
      console.log("imgfoward")
      imgForward();
    }
  }

  function draw(event) {
    let x = event.pageX - canvas.offsetLeft;
    let y = event.pageY - canvas.offsetTop;

    if (isLoadedImage && isDrag && !isCrossedMask) {
      isCrossedMask = (isStartInsideMask && !isInsideMask(x, y)) || (!isStartInsideMask && isInsideMask(x, y));
    }
   
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 5;
    ribeyeContext.lineCap = 'round';
    ribeyeContext.lineJoin = 'round';
    ribeyeContext.lineWidth = 5;

    if (isStartInsideMask) {
      context.strokeStyle = "rgb(0, 255, 0)";
      ribeyeContext.strokeStyle = "rgb(0, 255, 0)";
    } else {
      context.strokeStyle = "rgb(255, 0 , 0)";
      ribeyeContext.strokeStyle = "rgb(0, 0 , 0)";
    }
    boundaryChangeDraw(x, y);
  }

  function addEventListenerToCanvas(canvas) {
    canvas.addEventListener('mousedown', dragStart);
    canvas.addEventListener('mouseup', dragEnd);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', dragStart);
    canvas.addEventListener('touchend', dragEnd);
    canvas.addEventListener('touchmove', draw);
  }

  function initEventHandler() {
    if (operatingButton == "Mouse") {
      clearButton.addEventListener('click', clearExceptImg);
      imgForwardButton.addEventListener('click', imgForward);
      imgBackwardButton.addEventListener('click', imgBackward);
      downloadButton.addEventListener('click', downloadImg);
    } else if (operatingButton == "Pentab") {
      clearButton.addEventListener('contextmenu', clearExceptImg);
      imgForwardButton.addEventListener('contextmenu', imgForward);
      imgBackwardButton.addEventListener('contextmenu', imgBackward);
      downloadButton.addEventListener('contextmenu', downloadImg);
    }
   
    addEventListenerToCanvas(canvas);
    addEventListenerToCanvas(initPreviewCanvas);
  }

  function createSortedPathAndImgList(e) {
    let crossDirList = [];
    let ribeyeDirList = [];
    let previewDirList = [];
    for (let i = 0; i < e.target.files.length; i++) {
      let fileData = e.target.files[i];

      // 画像ファイル以外は処理をしない
      if(!fileData.type.match('image.*')) {
        continue
      }

      // ディレクトリの相対パス(絶対パスはセキュリティ上取得できない)
      let relativePath = fileData.webkitRelativePath;

      if (relativePath.indexOf("cross_section") != -1) {
        crossDirList.push([fileData,relativePath]);
      } else if (relativePath.indexOf("ribeye_mask") != -1) {
        ribeyeDirList.push([fileData,relativePath]);
      } else if (relativePath.indexOf("preview") != -1) {
        previewDirList.push([fileData,relativePath]);
      }
    }

    // 枚数が全て一致しない場合処理しない
    if (!(crossDirList.length == ribeyeDirList.length && ribeyeDirList.length == previewDirList.length)) {
      // TODO: どの写真が余っているのか、不足しているのかアラートで知らせる
      alert('cross_section, ribeye_mask, preview の写真枚数が一致しません');
      return;
    }
    
    for (let i = 0; i < crossDirList.length; i++) {
      let crossName = crossDirList[i][1].slice(crossDirList[i][1].lastIndexOf("/")+1, -4);
      let true_j;
      let true_k;

      for (let j = 0; j < ribeyeDirList.length; j++) {   
        let ribeyeName = ribeyeDirList[j][1].slice(ribeyeDirList[j][1].lastIndexOf("/")+1, -4);
        if (crossName == ribeyeName) {
          true_j = j
          break
        }
      }

      for (let k = 0; previewDirList.length; k++) {
        let previewName = previewDirList[k][1].slice(previewDirList[k][1].lastIndexOf("/")+1, -4);
        if (crossName == previewName) {
          true_k = k
          break
        }
      }

      loadedPathAndImgList.push([crossDirList[i], ribeyeDirList[true_j], previewDirList[true_k]]);
    }

  }

  // デフォルトでは名前降順のfileData, relativePathを、[cross, ribeye, preview], []... の名前昇順のリスト構造に整え
  // canvasにその一枚目を表示、画像遷移ボタンを有効にする。
  function loadFileDatas(e) {
    createSortedPathAndImgList(e);
    setImages(loadedPathAndImgList[0]);
    imgForwardButton.disabled = false;
    isLoadedImage = true
    isAbleToUpload = checkAbleToUpload();
  }

  function convertArray(data) {
    const dataArray = [];
    const dataString = data.split('\n');
    // 一行目はタイトルだから飛ばす
    for (let i = 0; i < dataString.length-1; i++) {
      if (dataString[i+1] == "") {
        continue
      }

      dataArray[i] = dataString[i+1].split(',');
    }

    return dataArray;
  }

  function loadCsv(e) {
    let fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0])

    fileReader.onload = () => {
      let result = fileReader.result;
      csvData = convertArray(result);
      isAbleToUpload = checkAbleToUpload();
    }
  }

  function checkAbleToUpload() {
    let csvDataCheck = (csvData.length != 0);
    let imgDataCheck = (loadedPathAndImgList.length != 0);
    let lengthCheck = (csvData.length == loadedPathAndImgList.length);
    if (csvDataCheck && imgDataCheck && lengthCheck) {
      return true;
    } else if (csvDataCheck && imgDataCheck && !lengthCheck) {
      alert("画像データとcsvデータの数が一致しません。\n自動アップロード機能はオフになりました。");
      return false;
    } else {
      return false;
    }
  }

  initEventHandler();
  fileInput.addEventListener('change', loadFileDatas, false);
  csvInput.addEventListener('change', loadCsv, false)
});

// 右クリックのメニューが出ないようにする
document.oncontextmenu = function () {
  return false;
}