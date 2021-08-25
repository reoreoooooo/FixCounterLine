window.addEventListener('load', () => {
    // ストレージの呼び出し
  let myStorage = localStorage;

  const clearButton = document.querySelector('#clear-button');
  const downloadButton = document.querySelector('#download-button');
  const imgForwardButton = document.querySelector('#img-forward-button');
  const imgBackwardButton = document.querySelector('#img-backward-button');
  const relativePathDiplay = document.querySelector('#relative-path');
  const fileInput = document.getElementById('file');
  let imgCount = 0;
  
  const canvasWidth = 440;
  const canvasHeight = 300;

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

  let oriPreviewImg = new Image();
  let previewImg = new Image();
  let oriRibeyeImg = new Image();
  let ribeyeImg = new Image();
  let oriCrossSectionImg = cv.Mat.ones(canvasHeight, canvasWidth, cv.CV_8UC3);

  let ribeyeImageData;　　// [r, g, b, a, r, g, b, a ...]というデータ構造になっている
  let loadedPathAndImgList = [];

  let isStartInsideMask = false;
  let isEndInsideMask = false;
  let isCrossedMask = false;
  let isChangedContour = false;
  
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
      context.moveTo(x, y);  // ドラッグ開始時の線の開始位置
      ribeyeContext.moveTo(x, y);  // ドラッグ開始時の線の開始位置
    } else {
      context.moveTo(nowPosition.x, nowPosition.y);  // ドラッグ中の線の開始位置
      ribeyeContext.moveTo(nowPosition.x, nowPosition.y);  // ドラッグ中の線の開始位置
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
    // ローカルストレージから配列を取得
    let logs = JSON.parse(myStorage.getItem("__log"));
    // 画像化する
    let oriDataURL = canvas.toDataURL();
    let ribeyeDataURL = ribeyeCanvas.toDataURL();
    // 配列に画像を格納
    logs[0] = {oriDataURL, ribeyeDataURL};
    // ローカルストレージに配列を保存
    myStorage.setItem("__log", JSON.stringify(logs));
 }

  // Canvasを戻す
  function prevCanvas() {
    let logs = JSON.parse(myStorage.getItem("__log"));
    let preimageDatas;
    if (logs.length > 0) {
      myStorage.setItem("__log", JSON.stringify(logs));
      preimageDatas = logs.shift();
      //画像を描写する
      previewImg.src = preimageDatas["oriDataURL"];
      previewImg.onload = function() {
        //Canvasを初期化する
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.drawImage(previewImg, 0, 0);
      }

      ribeyeImg.src = preimageDatas["ribeyeDataURL"];
      ribeyeImg.onload = function() {
        //Canvasを初期化する
        ribeyeContext.clearRect(0, 0, canvasWidth, canvasHeight);
        ribeyeContext.drawImage(ribeyeImg, 0, 0);
      }
    }
  }

  function clearExceptImg() {
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(oriPreviewImg, 0, 0, canvasWidth, canvasHeight);
    ribeyeContext.clearRect(0, 0, canvasWidth, canvasHeight);
    ribeyeContext.drawImage(oriRibeyeImg, 0, 0, canvasWidth, canvasHeight);
    //changeBoundary();
  }

  function imgForward() {
    imgCount++;
    isChangedContour = false;
    checkImgbtnEnable(imgCount);
    setCrossSectionImage(loadedPathAndImgList[imgCount][0]);
    setAndGetRibeyeImage(loadedPathAndImgList[imgCount][1]);
  }

  function imgBackward() {
    imgCount--;
    isChangedContour = false;
    checkImgbtnEnable(imgCount);
    setCrossSectionImage(loadedPathAndImgList[imgCount][0]);
    setAndGetRibeyeImage(loadedPathAndImgList[imgCount][1]);
  }

  function checkImgbtnEnable(imgCount) {
    if (imgCount <= 0) {
      imgBackwardButton.disabled = true;
    } else if (imgCount >= loadedPathAndImgList.length - 1) {
      imgForwardButton.disabled = true;
    } else {
      imgBackwardButton.disabled = false;
      imgForwardButton.disabled = false;
    }
  }

  // function setPreviewImage(dataAndPath) {
  //   let reader = new FileReader();
  //   // ファイル読み込みに成功したときの処理
  //   reader.onload = function() {
  //     oriPreviewImg.src = reader.result;
  //     oriPreviewImg.onload = function() {
  //       // canvas内の要素をクリアして、画像を描画
  //       context.clearRect(0, 0, canvasWidth, canvasHeight);
  //       context.drawImage(oriPreviewImg, 0, 0, canvasWidth, canvasHeight);
        
  //     }
  //   }
  //   // index番目のpreview, ribeyeの読み込みを行う
  //   reader.readAsDataURL(dataAndPath[0]);
  // }

  function setAndGetRibeyeImage(dataAndPath) {
    let reader = new FileReader();
    // ファイル読み込みに成功したときの処理
    reader.onload = function() {
      oriRibeyeImg.src = reader.result;
      oriRibeyeImg.onload = function() {
        // canvas内の要素をクリアして、画像を描画。imagedataを取得
        ribeyeContext.clearRect(0, 0, canvasWidth, canvasHeight);
        ribeyeContext.drawImage(oriRibeyeImg, 0, 0, canvasWidth, canvasHeight);
        ribeyeImageData = ribeyeContext.getImageData(0,0,canvasWidth,canvasHeight).data;
      }
    }
    // index番目のpreview, ribeyeの読み込みを行う
    reader.readAsDataURL(dataAndPath[0]);
  }

  function setCrossSectionImage(dataAndPath) {
    let reader = new FileReader();
    let crossSectionImg = new Image();
    // ファイル読み込みに成功したときの処理
    reader.onload = function() {
      crossSectionImg.src = reader.result;
      crossSectionImg.onload = function() {
        // canvas内の要素をクリアして、画像を描画。imagedataを取得
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.drawImage(crossSectionImg, 0, 0, canvasWidth, canvasHeight);
        relativePathDiplay.textContent = dataAndPath[1];  
        oriCrossSectionImg = cv.imread("preview-draw-area");
        changeBoundary()
      }
    }
    // index番目のpreview, ribeyeの読み込みを行う
    reader.readAsDataURL(dataAndPath[0]);
  }

  function isInsideMask(x, y) {
    let r = ribeyeImageData[(x + y * canvasWidth) * 4];
    let g = ribeyeImageData[(x + y * canvasWidth) * 4 + 1];
    let b = ribeyeImageData[(x + y * canvasWidth) * 4 + 2];

    if (r == 255 && g == 255 && b == 255) {
      return true;
    } else {
      return false;
    }
  }

  function detectContour() {
    let ribeyeOri = cv.imread("ribeye-area");
    let ribeyeOriGray = new cv.Mat();
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    let maskResult = cv.Mat.ones(canvasHeight, canvasWidth, cv.CV_8UC3);　// opencvでは(縦, 横)になることに注意
    let contourResult = cv.Mat.ones(canvasHeight, canvasWidth, cv.CV_8UC3);
    let point = new cv.Point(0, 0);
    let whiteColor = new cv.Scalar(255, 255, 255);
    let greenColor = new cv.Scalar(0, 255, 0);
    let maxArea = 0;
    let maxAreaIndex = 0;

    cv.cvtColor(ribeyeOri, ribeyeOriGray, cv.COLOR_RGBA2GRAY, 0);
    cv.findContours(ribeyeOriGray, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE, point);
    //　一番大きな多角形を取得
    for (let i = 0; i < contours.size(); i++) {
      let cnt = contours.get(i);
      let area = cv.contourArea(cnt, false);
      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = i;
      }
    }

    cv.drawContours(maskResult, contours, maxAreaIndex, whiteColor, cv.FILLED);
    cv.drawContours(contourResult, contours, maxAreaIndex, greenColor, 2);
    cv.imshow("ribeye-area", maskResult);
    cv.imshow("ribeye-contour-area", contourResult);

    ribeyeOri.delete();;
    ribeyeOriGray.delete();
    contours.delete();
    hierarchy.delete();
    maskResult.delete();

    return contourResult;
  }

  function changeBoundary() {
    let ori = cv.Mat.ones(canvasHeight, canvasWidth, cv.CV_8UC3);
    let contourResult = cv.Mat.ones(canvasHeight, canvasWidth, cv.CV_8UC3);
    contourResult = detectContour();
    ori = oriCrossSectionImg;
    for (let i = 0; i < canvasHeight; i++) {
      for (let j = 0; j < canvasWidth; j++) {
        if (contourResult.ucharPtr(i, j)[1] == 255) {
          ori.ucharPtr(i, j)[0] = 0;
          ori.ucharPtr(i, j)[1] = 255;
          ori.ucharPtr(i, j)[2] = 0;
        }
      }
    }
    cv.imshow("preview-draw-area", ori);
    ori.delete();
  }
  
  // 「context.beginPath()」と「context.closePath()」を都度draw関数内で実行するよりも、
  // 線の描き始め(dragStart関数)と線の描き終わり(dragEnd)で1回ずつ読んだほうがより綺麗に線画書ける
  function dragStart(event) {
    context.beginPath();
    ribeyeContext.beginPath();
    isDrag = true;
    isStartInsideMask = isInsideMask(event.layerX, event.layerY);

    startPosition.x = event.layerX;
    startPosition.y = event.layerY;
  }

  function dragEnd(event) {
    if (!isDrag) {
      return;
    }

    context.closePath();
    ribeyeContext.closePath();
    isEndInsideMask = isInsideMask(event.layerX, event.layerY);

    endPosition.x = event.layerX;
    endPosition.y = event.layerY;

    let isAddArea = isInsideMask(startPosition.x, startPosition.y) && isInsideMask(endPosition.x, endPosition.y);
    let isClipArea =  !isInsideMask(startPosition.x, startPosition.y) && !isInsideMask(endPosition.x, endPosition.y);
    // Dragしていて、かつ内→外もしくは外→内　になった時のみpreCanvesを動作させる。
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

    // canvasにある画像をdownloadURLとして更新
    let base64 = canvas.toDataURL("image/jpeg");
    downloadButton.href = base64;
  }

  function draw(event) {
    let x = event.layerX;
    let y = event.layerY;
    // TODO: マスクの境界を横断したかどうか判定し、線の色等を変更する機構を作る
    // TODO: 見かけ上は色を変更、実際は黒みたいな感じで線をかけるといい
    if (isLoadedImage && isDrag && !isCrossedMask) {
      isCrossedMask = (isStartInsideMask && !isInsideMask(x, y)) || (!isStartInsideMask && isInsideMask(x, y));
    }
   
    context.lineCap = 'round';  // 丸みを帯びた線にする
    context.lineJoin = 'round'; // 丸みを帯びた線にする
    context.lineWidth = 5;      // 線の太さ
    ribeyeContext.lineCap = 'round';  // 丸みを帯びた線にする
    ribeyeContext.lineJoin = 'round'; // 丸みを帯びた線にする
    ribeyeContext.lineWidth = 5;      // 線の太さ

    if (isStartInsideMask) {
      context.strokeStyle = 'red'; // 線の色
      ribeyeContext.strokeStyle = 'red'; // 線の色
    } else {
      context.strokeStyle = 'black'; // 線の色
      ribeyeContext.strokeStyle = 'black'; // 線の色
    }
    boundaryChangeDraw(x, y);
  }

  function addEventListenerToCanvas(canvas) {
    canvas.addEventListener('mousedown', (event) => {
      dragStart(event);
    });
    canvas.addEventListener('mouseup', (event) => {
      dragEnd(event);
    });
    canvas.addEventListener('mouseout', (event) => {
      dragEnd(event);
    }); // TODO: 余分に出力されている。直す必要があるかどうか検討
    canvas.addEventListener('mousemove', (event) => {
      draw(event);
    });
  }

  function initEventHandler() {
    clearButton.addEventListener('click', clearExceptImg);
    imgForwardButton.addEventListener('click', imgForward);
    imgBackwardButton.addEventListener('click', imgBackward);
    addEventListenerToCanvas(canvas);
    addEventListenerToCanvas(ribeyeCanvas);
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
      loadedPathAndImgList.push([crossDirList[i], ribeyeDirList[i], previewDirList[i]]);
    }
  }

  // function sleep(waitTime) {
  //   let startTime = new Date();
  //   while(new Date() - startTime < waitTime);
  // }


  // デフォルトでは名前降順のfileData, relativePathを、[cross, ribeye, preview], []... の名前昇順のリスト構造に整え
  // canvasにその一枚目を表示、画像遷移ボタンを有効にする。
  function loadFileDatas(e) {
    createSortedPathAndImgList(e);
    setCrossSectionImage(loadedPathAndImgList[0][0]);
    setAndGetRibeyeImage(loadedPathAndImgList[0][1]);
    imgForwardButton.disabled = false;
    isLoadedImage = true
  }

  function initLocalStorage() {
    myStorage.setItem("__log", JSON.stringify([]));
  }
  
  initEventHandler();
  initLocalStorage();
  fileInput.addEventListener('change', loadFileDatas, false);
});