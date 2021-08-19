// ページの読み込みが完了したらコールバック関数が呼ばれる
// ※コールバック: 第2引数の無名関数(=関数名が省略された関数)
window.addEventListener('load', () => {
  const clearButton = document.querySelector('#clear-button');
  const downloadButton = document.querySelector('#download-button');
  const imgForwardButton = document.querySelector('#img-forward-button');
  const imgBackwardButton = document.querySelector('#img-backward-button');
  const relativePathDiplay = document.querySelector('#relative-path');
  const file = document.getElementById('file');
  
  const canvas = document.querySelector('#draw-area');
  const context = canvas.getContext('2d');
  const canvasWidth = 400;
  const canvasHeight = 400;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  let displayingImg = new Image();
  let localDirAndData = [];
  
  // 直前のマウスのcanvas上のx座標とy座標を記録する
  const lastPosition = { x: null, y: null };
  
  // マウスがドラッグされているか(クリックされたままか)判断するためのフラグ
  let isDrag = false;
  
  // 絵を書く
  function draw(x, y) {
    // マウスがドラッグされていなかったら処理を中断する。
    // ドラッグしながらしか絵を書くことが出来ない。
    if(!isDrag) {
      return;
    }
  
    // 「context.beginPath()」と「context.closePath()」を都度draw関数内で実行するよりも、
    // 線の描き始め(dragStart関数)と線の描き終わり(dragEnd)で1回ずつ読んだほうがより綺麗に線画書ける
  
    // 線の状態を定義する
    // MDN CanvasRenderingContext2D: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineJoin
    context.lineCap = 'round'; // 丸みを帯びた線にする
    context.lineJoin = 'round'; // 丸みを帯びた線にする
    context.lineWidth = 5; // 線の太さ
    context.strokeStyle = 'black'; // 線の色
  
    // 書き始めは lastPosition.x, lastPosition.y の値はnullとなっているため、
    // クリックしたところを開始点としている。
    // この関数(draw関数内)の最後の2行で lastPosition.xとlastPosition.yに
    // 現在のx, y座標を記録することで、次にマウスを動かした時に、
    // 前回の位置から現在のマウスの位置まで線を引くようになる。
    if (lastPosition.x === null || lastPosition.y === null) {
      // ドラッグ開始時の線の開始位置
      context.moveTo(x, y);
    } else {
      // ドラッグ中の線の開始位置
      context.moveTo(lastPosition.x, lastPosition.y);
    }
    // context.moveToで設定した位置から、context.lineToで設定した位置までの線を引く。
    // - 開始時はmoveToとlineToの値が同じであるためただの点となる。
    // - ドラッグ中はlastPosition変数で前回のマウス位置を記録しているため、
    //   前回の位置から現在の位置までの線(点のつながり)となる
    context.lineTo(x, y);
  
    // context.moveTo, context.lineToの値を元に実際に線を引く
    context.stroke();
  
    // 現在のマウス位置を記録して、次回線を書くときの開始点に使う
    lastPosition.x = x;
    lastPosition.y = y;
  }
  
  // canvas上に書いた絵を全部消す
  function clearExceptImg() {
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(displayingImg, 0, 0, canvasWidth, canvasHeight);
  }

  function imgForward() {
    console.log("Forward");
  }

  function imgBackward() {
    console.log("Backward");
  }

  function imgDisplaing(fileData, relativePath) {
    // FileReaderオブジェクトを使ってファイル読み込み
    let reader = new FileReader();
    // ファイル読み込みに成功したときの処理
    reader.onload = function() {
      displayingImg.src = reader.result;
      displayingImg.onload = function() {
        // canvas内の要素をクリアして、画像を描画
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.drawImage(displayingImg, 0, 0, canvasWidth, canvasHeight);
        relativePathDiplay.textContent = relativePath;  
      }
    }
    reader.readAsDataURL(fileData);
  }
  
  // マウスのドラッグを開始したらisDragのフラグをtrueにしてdraw関数内で
  // お絵かき処理が途中で止まらないようにする
  function dragStart(event) {
    // これから新しい線を書き始めることを宣言する
    // 一連の線を書く処理が終了したらdragEnd関数内のclosePathで終了を宣言する
    context.beginPath();
  
    isDrag = true;
  }
  // マウスのドラッグが終了したら、もしくはマウスがcanvas外に移動したら
  // isDragのフラグをfalseにしてdraw関数内でお絵かき処理が中断されるようにする
  function dragEnd(event) {
    // 線を書く処理の終了を宣言する
    context.closePath();
    isDrag = false;
  
    // 描画中に記録していた値をリセットする
    lastPosition.x = null;
    lastPosition.y = null;

    // canvasにある画像をdownloadURLとして更新
    let base64 = canvas.toDataURL("image/jpeg");
    downloadButton.href = base64;
  }
  
  // マウス操作やボタンクリック時のイベント処理を定義する
  function initEventHandler() {
    clearButton.addEventListener('click', clearExceptImg);
    imgForwardButton.addEventListener('click', imgForward);
    imgBackwardButton.addEventListener('click', imgBackward);
    canvas.addEventListener('mousedown', dragStart);
    canvas.addEventListener('mouseup', dragEnd);
    canvas.addEventListener('mouseout', dragEnd);
    canvas.addEventListener('mousemove', (event) => {
      draw(event.layerX, event.layerY);
    });
  }


  // デフォルトでは名前降順のfileData, relativePathを
  // [cross, ribeye, preview], []... の名前昇順のリスト構造になるように体裁を整え、一枚目を表示させる。
  function loadImageDatas(e) {
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

    if (!(crossDirList.length == ribeyeDirList.length && ribeyeDirList.length == previewDirList.length)) {
      // TODO: どの写真が余っているのか、不足しているのかアラートで知らせる
      alert('cross_section, ribeye_mask, preview の写真枚数が一致しません');
      return;
    }

    for (let i = 0; i < crossDirList.length; i++) {
      localDirAndData.push([crossDirList[i], ribeyeDirList[i], previewDirList[i]]);
    }

    imgDisplaing(localDirAndData[0][0][0], localDirAndData[0][0][1]);
  }
  
  // イベント処理を初期化する
  initEventHandler();
  // ファイルが指定された時にloadLocalImage()を実行
  file.addEventListener('change', loadImageDatas, false);
});