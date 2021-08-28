window.addEventListener('load', () => {
  const clearButton = document.querySelector('#clear-button');
  const downloadButton = document.querySelector('#download-button');
  const imgForwardButton = document.querySelector('#img-forward-button');
  const imgBackwardButton = document.querySelector('#img-backward-button');
  const relativePathDiplay = document.querySelector('#relative-path');
  const fileInput = document.getElementById('file');
  let imgCount = 0;
  
  let canvasWidth = 4000;
  let canvasHeight = 3000;

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

  let oriCrossSectionImg = new Image();
  let cvOriCrossSectionImg = cv.Mat.ones(canvasHeight, canvasWidth, cv.CV_8UC3);
  let preCrossSectionImg = cv.Mat.ones(canvasHeight, canvasWidth, cv.CV_8UC3);
  let preRibeyeImg = cv.Mat.ones(canvasHeight, canvasWidth, cv.CV_8UC3);
  let oriRibeyeImg = new Image();

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
    preRibeyeImg = cv.imread("ribeye-area");
    preCrossSectionImg = cv.imread("preview-draw-area");
 }

  // Canvasを戻す
  function prevCanvas() {
    cv.imshow("ribeye-area", preRibeyeImg);
    cv.imshow("preview-draw-area", preCrossSectionImg);
  }

  function clearExceptImg() {
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(oriCrossSectionImg, 0, 0, canvasWidth, canvasHeight);
    ribeyeContext.clearRect(0, 0, canvasWidth, canvasHeight);
    ribeyeContext.drawImage(oriRibeyeImg, 0, 0, canvasWidth, canvasHeight);
    changeBoundary();
    saveToLocalStoreage();
  }

  function imgForward() {
    imgCount++;
    imgForwardButton.disabled = true;
    imgBackwardButton.disabled = true;
    isChangedContour = false;
    setImages(loadedPathAndImgList[imgCount]);
  }

  function imgBackward() {
    imgCount--;
    imgForwardButton.disabled = true;
    imgBackwardButton.disabled = true;
    isChangedContour = false;
    setImages(loadedPathAndImgList[imgCount]);
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

  function setImages(dataAndPaths) {
    let reader = new FileReader;
      
    reader.readAsDataURL(dataAndPaths[1][0]);
    reader.addEventListener("load", function(){
      oriRibeyeImg.src = reader.result;
      oriRibeyeImg.addEventListener("load", function(){
        // タイミング的にちょっと危ないけど、個々がcanvasWidth, height を取得できる最速タイミング
        // TODO: ribeyeimageとsectionimageの処理を分けないほうが良い。
        canvasWidth = this.width;
        canvasHeight =this.height;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        ribeyeCanvas.width = canvasWidth;
        ribeyeCanvas.height = canvasHeight;

        // canvas内の要素をクリアして、画像を描画。imagedataを取得
        ribeyeContext.clearRect(0, 0, canvasWidth, canvasHeight);
        ribeyeContext.drawImage(oriRibeyeImg, 0, 0, canvasWidth, canvasHeight);
        setCrossSectionImage(dataAndPaths[0]);
      });
    });

  }

  function setCrossSectionImage(dataAndPath) {
    let reader = new FileReader();

    reader.readAsDataURL(dataAndPath[0]);
    reader.addEventListener("load", function(){
      oriCrossSectionImg.src = reader.result;
      oriCrossSectionImg.addEventListener("load", function(){
        // canvas内の要素をクリアして、画像を描画。imagedataを取得
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.drawImage(oriCrossSectionImg, 0, 0, canvasWidth, canvasHeight);
        relativePathDiplay.textContent = dataAndPath[1];  
        cvOriCrossSectionImg = cv.imread("preview-draw-area");
        changeBoundary()
        saveToLocalStoreage();
        setTimeout(checkImgbtnEnable, 1000, imgCount);
      });
    });
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

  function detectContour() {
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

    ribeyeOri.delete();;
    ribeyeOriGray.delete();
    hierarchy.delete();
    maskResult.delete();

    return [contours, maxAreaIndex];
  }

  function changeBoundary() {
    let ori = cv.Mat.ones(canvasHeight, canvasWidth, cv.CV_8UC4);
    let contourResult = detectContour();
    
    ori = cvOriCrossSectionImg.clone();
    cv.cvtColor(ori, ori, cv.COLOR_RGBA2RGB); //8UC4 -> 8UC3への変更。imreadすると8UC4に勝手に変換されてしまう。
    cv.drawContours(ori, contourResult[0], contourResult[1], new cv.Scalar(0, 255, 0), 3);

    cv.imshow("preview-draw-area", ori);
    ori.delete();
  }
  
  // 「context.beginPath()」と「context.closePath()」を都度draw関数内で実行するよりも、
  // 線の描き始め(dragStart関数)と線の描き終わり(dragEnd)で1回ずつ読んだほうがより綺麗に線画書ける
  function dragStart(event) {
    let x = event.layerX;
    let y = event.layerY;

    context.beginPath();
    ribeyeContext.beginPath();
    isDrag = true;
    isStartInsideMask = isInsideMask(x, y);

    startPosition.x = x;
    startPosition.y = y;
  }

  function dragEnd(event) {
    if (!isDrag) {
      return;
    }
    let x = event.layerX;
    let y = event.layerY;

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

  function downloadImg() {
    let imagedata = context.getImageData(0, 0, canvasWidth, canvasHeight); 
    let BMPWriter = new TBMPWriter(imagedata);
    // path = 20210817-153843_Irongate/cross_section/20210815232725_0199333837010053310201982011210813211026212128.jpg
    // name = 20210815232725_0199333837010053310201982011210813211026212128.jpg
    // filename = 20210815232725_0199333837010053310201982011210813211026212128
    let path =  loadedPathAndImgList[imgCount][0][1];
    let name = path.split("/")[2];
    let filename = name.substr(0, name.length-4);
   
    BMPWriter.SaveToFile(filename + ".bmp");
    imgForward();
  }

  function draw(event) {
    let x = event.layerX;
    let y = event.layerY;

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
    canvas.addEventListener('mouseout', dragEnd); // TODO: 余分に出力されている。直す必要があるかどうか検討
    canvas.addEventListener('mousemove', draw);
  }

  function initEventHandler() {
    clearButton.addEventListener('click', clearExceptImg);
    imgForwardButton.addEventListener('click', imgForward);
    imgBackwardButton.addEventListener('click', imgBackward);
    downloadButton.addEventListener('click', downloadImg);
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

  // デフォルトでは名前降順のfileData, relativePathを、[cross, ribeye, preview], []... の名前昇順のリスト構造に整え
  // canvasにその一枚目を表示、画像遷移ボタンを有効にする。
  function loadFileDatas(e) {
    createSortedPathAndImgList(e);
    setImages(loadedPathAndImgList[0]);
    imgForwardButton.disabled = false;
    isLoadedImage = true
  }

  initEventHandler();
  fileInput.addEventListener('change', loadFileDatas, false);
});