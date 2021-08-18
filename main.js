// ページの読み込みが完了したらコールバック関数が呼ばれる
// ※コールバック: 第2引数の無名関数(=関数名が省略された関数)
window.addEventListener('load', () => {
  const canvas = document.querySelector('#draw-area');
  const canvasWidth = 400;
  const canvasHeight = 400;
  const file = document.getElementById('file');
  var img = new Image();
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext('2d');
  
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
    context.drawImage(img, 0, 0, canvasWidth, canvasHeight);
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
  }
  
  // マウス操作やボタンクリック時のイベント処理を定義する
  function initEventHandler() {
    const clearButton = document.querySelector('#clear-button');
    clearButton.addEventListener('click', clearExceptImg);
  
    canvas.addEventListener('mousedown', dragStart);
    canvas.addEventListener('mouseup', dragEnd);
    canvas.addEventListener('mouseout', dragEnd);
    canvas.addEventListener('mousemove', (event) => {
      // eventの中の値を見たい場合は以下のようにconsole.log(event)で、
      // デベロッパーツールのコンソールに出力させると良い
      // console.log(event);
  
      draw(event.layerX, event.layerY);
    });
  }

  function loadLocalImage(e) {
    // ファイル情報を取得
    var fileData = e.target.files[0];
  
    // 画像ファイル以外は処理を止める
    if(!fileData.type.match('image.*')) {
      alert('画像を選択してください');
      return;
    }
  
    // FileReaderオブジェクトを使ってファイル読み込み
    var reader = new FileReader();
    // ファイル読み込みに成功したときの処理
    reader.onload = function() {
      img.src = reader.result;
      img.onload = function() {
        // canvas内の要素をクリアして、画像を描画
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      }
    };
    // ファイル読み込みを実行
    reader.readAsDataURL(fileData);
  }
  
  // イベント処理を初期化する
  initEventHandler();
  // ファイルが指定された時にloadLocalImage()を実行
  file.addEventListener('change', loadLocalImage, false);
});