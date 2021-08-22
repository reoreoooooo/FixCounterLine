window.addEventListener('load', () => {
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

  let previewImg = new Image();
  let ribeyeImg = new Image();

  let ribeyeImageData;　　// [r, g, b, a, r, g, b, a ...]というデータ構造になっている
  let loadedPathAndImgList = [];
  
  // 始点、終点、現在点のマウスのcanvas上のxy座標
  const startPosition = {x: null, y: null};
  const endPosition = {x: null, y: null};
  const nowPosition = {x: null, y: null};
  
  // マウスがドラッグされているか判断するためのフラグ
  let isDrag = false;
  
  // 絵を書く
  function draw(x, y) {
    // ドラッグしながらしか絵を書くことが出来ない。
    if(!isDrag) {
      return;
    }
  
    context.lineCap = 'round';  // 丸みを帯びた線にする
    context.lineJoin = 'round'; // 丸みを帯びた線にする
    context.lineWidth = 5;      // 線の太さ
    context.strokeStyle = 'black'; // 線の色
  
    // context.moveToで設定した位置から、context.lineToで設定した位置までの線を引く。
    if (nowPosition.x === null || nowPosition.y === null) {
      context.moveTo(x, y);  // ドラッグ開始時の線の開始位置
    } else {
      context.moveTo(nowPosition.x, nowPosition.y);  // ドラッグ中の線の開始位置
    }
    context.lineTo(x, y);
    context.stroke();
  
    // 現在のマウス位置を記録して、次回線を書くときの開始点に使う
    nowPosition.x = x;
    nowPosition.y = y;
  }
  
  function clearExceptImg() {
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(previewImg, 0, 0, canvasWidth, canvasHeight);
  }

  function imgForward() {
    imgCount++;
    checkImgbtnEnable(imgCount);
    setPreviewImage(loadedPathAndImgList[imgCount][2]);
    setAndGetRibeyeImage(loadedPathAndImgList[imgCount][1]);
  }

  function imgBackward() {
    imgCount--;
    checkImgbtnEnable(imgCount);
    setPreviewImage(loadedPathAndImgList[imgCount][2]);
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

  function setPreviewImage(dataAndPath) {
    let reader = new FileReader();
    // ファイル読み込みに成功したときの処理
    reader.onload = function() {
      previewImg.src = reader.result;
      previewImg.onload = function() {
        // canvas内の要素をクリアして、画像を描画
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.drawImage(previewImg, 0, 0, canvasWidth, canvasHeight);
        relativePathDiplay.textContent = dataAndPath[1];  
      }
    }
    // index番目のpreview, ribeyeの読み込みを行う
    reader.readAsDataURL(dataAndPath[0]);
  }

  function setAndGetRibeyeImage(dataAndPath) {
    let reader = new FileReader();
    // ファイル読み込みに成功したときの処理
    reader.onload = function() {
      ribeyeImg.src = reader.result;
      ribeyeImg.onload = function() {
        // canvas内の要素をクリアして、画像を描画。imagedataを取得
        ribeyeContext.clearRect(0, 0, canvasWidth, canvasHeight);
        ribeyeContext.drawImage(ribeyeImg, 0, 0, canvasWidth, canvasHeight);
        ribeyeImageData = ribeyeContext.getImageData(0,0,canvasWidth,canvasHeight).data;
      }
    }
    // index番目のpreview, ribeyeの読み込みを行う
    reader.readAsDataURL(dataAndPath[0]);
  }

  function isInsideMask(x, y) {
    let r = ribeyeImageData[(x + y * canvasWidth) * 4];
    let g = ribeyeImageData[(x + y * canvasWidth) * 4 + 1];
    let b = ribeyeImageData[(x + y * canvasWidth) * 4 + 2];

    if(r == 255 && g == 255 && b == 255) {
      return true;
    } else {
      return false;
    }
  }

  function changeBoundary() {
    // TODO: 始点終点の座標がマスクの内部か外部か判定し、切り取り、付け加えを判定
    // TODO: nowPositionも監視して、マスクに入って出たか、Andで条件付けしないといけない
    if (isInsideMask(startPosition.x, startPosition.y)) {
      console.log("start地点がマスク内");
    } else {
      console.log("start地点がマスク外");
    }

    if (isInsideMask(endPosition.x, endPosition.y)) {
      console.log("end地点がマスク内")
    } else {
      console.log("end地点がマスク外")
    }

  }
  
  // 「context.beginPath()」と「context.closePath()」を都度draw関数内で実行するよりも、
  // 線の描き始め(dragStart関数)と線の描き終わり(dragEnd)で1回ずつ読んだほうがより綺麗に線画書ける
  function dragStart(event) {
    context.beginPath();
    isDrag = true;

    startPosition.x = event.layerX;
    startPosition.y = event.layerY;
  }

  function dragEnd(event) {
    context.closePath();
    isDrag = false;

    endPosition.x = event.layerX;
    endPosition.y = event.layerY;

    // TODO: 始点終点の座標がマスクの内部か外部か判定し、切り取り、付け加えを判定。
    // マスクと線の交点を求め(何点もある場合は　last -> first)、「輪郭線及びマスクの更新」を行う
    changeBoundary();
  
    // 描画中に記録していた値をリセットする
    nowPosition.x = null;
    nowPosition.y = null;

    // canvasにある画像をdownloadURLとして更新
    let base64 = canvas.toDataURL("image/jpeg");
    downloadButton.href = base64;
  }

  function initEventHandler() {
    clearButton.addEventListener('click', clearExceptImg);
    imgForwardButton.addEventListener('click', imgForward);
    imgBackwardButton.addEventListener('click', imgBackward);
    canvas.addEventListener('mousedown', dragStart);
    canvas.addEventListener('mouseup', dragEnd);
    canvas.addEventListener('mouseout', dragEnd); // TODO: 余分に出力されている
    canvas.addEventListener('mousemove', (event) => {
      draw(event.layerX, event.layerY);
    });
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
    setPreviewImage(loadedPathAndImgList[0][2]);
    setAndGetRibeyeImage(loadedPathAndImgList[0][1]);
    imgBackwardButton.disabled = false;
    imgForwardButton.disabled = false;
  }
  
  initEventHandler();
  fileInput.addEventListener('change', loadFileDatas, false);
});