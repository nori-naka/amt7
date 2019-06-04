//-----------------------------------------------------
// 機能レイヤ側は必ず、名前空間の分離をお願いします。
// ルールとしては、
// ファイル名をオブジェクトとして、そのオブジェクトに
// 各種変数等をすべて収容する。

var RECORD_layer = RECORD_layer || {};
//START module
//------------------------------------------------------

RECORD_layer.coordinate;
RECORD_layer.vec_layer;
RECORD_layer.vec_source;
RECORD_layer.detail_text;

RECORD_layer.start_time = new Date().getTime();
RECORD_layer.log = function (text) {
    const now_time = new Date().getTime()
    console.log(`[${now_time - RECORD_layer.start_time} ms] ${text}`);
}

//-------------------------------------------------------
// 機能レイヤでは以下の関数を実装する
// add()         :その機能レイヤをmapオブジェクト上で稼働させるために
//                必要となるlayer,source,featureの登録を行う。
//                そして稼働開始を行う。
// setOpacity(v) :その機能レイヤの透過度を設定する。
// remove()      :その機能レイヤ自体をmapオブジェクトから削除する
//

RECORD_layer.icon_features = [];
RECORD_layer.add = function () {
    if (map) {
        //RECORD_layer.vec_source = new ol.source.Vector({ features: [] });
        RECORD_layer.vec_layer = new ol.layer.Vector({
            source: new ol.source.Vector({ features: [] })
        });
        map.addLayer(RECORD_layer.vec_layer);
        RECORD_layer.log("position.json addLayer");

        map.addOverlay(RECORD_layer.pop);
        map.addOverlay(RECORD_layer.memo_pop);
        // RECORD_layer.log("position.json addOverlayer");

        init_memo_pop_elm();
        init_s2t();

        // layerに自信を登録する。
        layers.RECORD_layer = RECORD_layer;

        setInterval(set_icon, 5000);
    }
}

function set_icon() {

    $.ajax({
        url: '/RECORD_layer/position.json',
        type: 'GET'
    }).done(function (data) {
        RECORD_layer.get_data(data).then(() => {
            RECORD_layer.vec_layer.getSource().clear();
            RECORD_layer.vec_layer.getSource().addFeatures(RECORD_layer.icon_features);
            RECORD_layer.icon_features = [];
            /*
            setTimeout(function(){
                map.addLayer(RECORD_layer.vec_layer);
                map.addOverlay(RECORD_layer.pop);
            }, 5000);
            */
        }).catch((err) => {
            console.log(err);
        });
    });
}


RECORD_layer.setOpacity = function (v) {
    RECORD_layer.vec_layer.setOpacity(v);
}

RECORD_layer.remove = function () {
    map.removeLayer(RECORD_layer.vec_layer);
}


RECORD_layer.memo_flag = false;
$("#memoBtn").on("click", function () {
    if (RECORD_layer.memo_flag) {
        RECORD_layer.memo_flag = false;
        $("#map").css({ "cursor": "auto" });
        $(this).css({ "background-color": buttonBlue });

    } else {
        RECORD_layer.memo_flag = true;
        $("#map").css({ "cursor": "cell" });
        $(this).css({ "background-color": buttonRed });
    }
});

RECORD_layer.memo_pop_elm = document.createElement('div');
RECORD_layer.memo_pop_elm.innerHTML = `<div class="text">
    <div>
        <p>MEMO</p>
        <textarea id="memo" class="text" rows="5" cols="20"></textarea>
        <div>
            <div id="speech_btn" class="mic_btn_blue"></div>
            <div id="memo_ok_btn" class="OK_blue">
                <div class="text_center">OK</div>
            </div>
        </div>
    </div>
</div>`

// RECORD_layer.memo_pop_elm.innerHTML = `<div class="text">
//     <div>
//         <p>MEMO</p>
//         <textarea id="memo" class="text" rows="5" cols="20"></textarea>
//         <div>
//             <div id="memo_ok_btn" class="OK_blue">
//                 <div class="text_center">OK</div>
//             </div>
//         </div>
//     </div>
// </div>`

RECORD_layer.memo_pop_elm.style.marginTop = "0";
RECORD_layer.memo_pop_elm.style.marginBottom = "1em";
RECORD_layer.memo_pop_elm.classList.add("balloon2");

RECORD_layer.memo_pop = new ol.Overlay({
    element: RECORD_layer.memo_pop_elm,
    positioning: 'bottom-center',
    autoPan: true,
    autoPanAnimation: {
        duration: 250
    },
});

var init_memo_pop_elm = function () {
    RECORD_layer.memo = document.getElementById("memo");
    RECORD_layer.memo_ok_btn = document.getElementById("memo_ok_btn");
    RECORD_layer.speech_btn = document.getElementById("speech_btn");

    RECORD_layer.memo_ok_btn.addEventListener("click", RECORD_layer.memo_ok);
    // speech2text(RECORD_layer.speech_btn, RECORD_layer.memo);
}

var memo_pos = null;
RECORD_layer.__$map_on_click__ = function (e) {
    if (RECORD_layer.memo_flag) {
        RECORD_layer.memo_pop.setPosition(e.coordinate);
        memo_pos = ol.proj.transform(e.coordinate, "EPSG:3857", "EPSG:4326")
    }
}

RECORD_layer.__$end_click__ = function () {
    RECORD_layer.memo_pop.setPosition(undefined);
    memo_pos = null;
}

RECORD_layer.memo_ok = function () {
    if (RECORD_layer.memo_flag && memo_pos) {
        var memo_elm = document.getElementById("memo");
        socketio.emit("file", JSON.stringify({
            user_name: users[myUid].name,
            lat: memo_pos[1],
            lng: memo_pos[0],
            date: new Date().toLocaleString(),
            memo: memo_elm.value
        }));
        memo_pos = null;
    }
    RECORD_layer.memo_pop.setPosition(undefined);
    RECORD_layer.memo.value = "";
}

//-------------------------------------------------------------
// Overlay
// 下記の例はpopupの登録を行います。
// 基本的に、Overlay,interation,control等のOpenlayers由来の機能を
// 使用する場合には、それぞれの機能レイヤにて登録してください。
//
RECORD_layer.pop_elm = document.createElement('div');
RECORD_layer.pop_elm.style.marginTop = "0";
RECORD_layer.pop_elm.style.marginBottom = "1em";
RECORD_layer.pop_elm.classList.add("balloon2");

RECORD_layer.pop = new ol.Overlay({
    element: RECORD_layer.pop_elm,
    positioning: 'bottom-center',
    autoPan: true,
    autoPanAnimation: {
        duration: 250
    },
});

//RECORD_layer.pop.setVisible(false);

//--------------------------------------------------------------
// popup_show  : 本体側でpopupのOverlayを表示する。
// popup_hidden: 本体側でpopupのOverlayを非表示にする。
// このpopup_showとpopup_hiddenは対象となるfeatureオブジェクトに
// feature.__$do_func__, feature.__$undo_func__として埋め込み、
// 本体側のmapのイベント処理として
// 対象featureにclickが発火した際に__$do_func__が呼ばれ、
// clickが発火したが対象featureが無い場合に__$undo_func__が呼ばれます。
//
RECORD_layer.popup_show = function (e, HTMLElementStr) {
    RECORD_layer.pop_elm.innerHTML = HTMLElementStr;
    RECORD_layer.pop.setPosition(e.coordinate);
    //RECORD_layer.pop.setVisible(true);
    console.log(JSON.stringify(e.coordinate));
}
RECORD_layer.popup_hidden = function () {
    //RECORD_layer.pop.setVisible(false);
    RECORD_layer.pop.setPosition(undefined);
}

//-------------------------------------------------------------
// layerの作成
// 下記の例では非同期通信（req_data)のレスポンスを受けて、
// get_dataがコールバックされて、レスポンスの内容でfeatureを作成し、
// その後、source、layerの順で作成されています。
// このfeatureの作成時に本体側イベントで呼び出される関数を埋めています。

RECORD_layer.last_hash = {};
RECORD_layer.get_data = function (s) {
    var hash = JSON.parse(s);

    var delete_items = [];
    Object.keys(hash).forEach(function (hash_key) {

        var exist_flag = false;
        Object.keys(RECORD_layer.last_hash).forEach(function (last_hash_key) {
            if (last_hash_key == hash_key) {
                exist_flag = true;
                return;
            }
        });
        if (!exist_flag) {

        }
    })
    RECORD_layer.last_hash = hash;

    return new Promise(function (resolve, reject) {
        //var hash = s.split(/}\s*,\s*{/);
        // new_items.forEach(function (data) {
        Object.keys(hash).forEach(function (hash_key) {
            var data = hash[hash_key];
            // Featureのnameの領域に文字列化したJSONデータを埋め込み、
            // それをPopup表示の際の内容にする。

            if (data.経度情報 == null || data.緯度情報 == null) return;

            coordinate = ol.proj.transform([parseFloat(data.経度情報), parseFloat(data.緯度情報)], "EPSG:4326", "EPSG:3857")
            var icon_feature = new ol.Feature({
                geometry: new ol.geom.Point(coordinate),
                name: JSON.stringify(data)
            });
            icon_feature.setStyle(new ol.style.Style({
                image: new ol.style.Icon({
                    anchor: [0.5, 1],
                    opacity: 1.0,
                    scale: 0.3,
                    src: data.video ? '/RECORD_layer/video_pin.png' : '/RECORD_layer/memo_pin.png'
                    // src: '/RECORD_layer/marker-icon64.png'
                })
            }));
            //----------------------------------------------------
            // 作成したfeatureに__$do_func__と__$undo_func__を
            // 埋め込みます。
            //
            icon_feature.__$do_func__ = function (e) {
                var res = "";

                // var items = icon_feature.getProperties().name.slice(2, -2).split(",");
                console.log(`name=${icon_feature.getProperties().name}`)
                console.dir(JSON.parse(icon_feature.getProperties().name))

                let data = JSON.parse(icon_feature.getProperties().name);
                Object.keys(data).forEach(function (key) {
                    if (key == 'video') {
                        res = res + `<div class="user">
                        <video src="${data[key]}" controls class="video"></video>
                        <p>
                        <a href="#!" onclick= "delete_hash('${hash_key}');">削除</a>
                        </p>
                        </div>`
                    } else if (key == "memo") {
                        res = res + `<div class="user">
                        <p class="text red">${data[key]}</p>
                        <p>
                        <a href="#!" onclick= "delete_hash('${hash_key}');">削除</a>
                        </p>
                        </div>`
                    } else {
                        res = res + `${key} : ${data[key]}<br>`;
                    }
                })
                console.log(`res=${res}`);

                // items.forEach((s) => {
                //     res = res + s.replace(/"/g, '') + "<br>"
                // });
                RECORD_layer.popup_show(e, res);
            };
            icon_feature.__$undo_func__ = function () {
                RECORD_layer.popup_hidden();
            }
            RECORD_layer.icon_features.push(icon_feature);
        });
        resolve();
    });
};

var delete_hash = function (key) {
    socketio.emit("file", JSON.stringify({
        delete: key
    }));
}
//------------------------------------------------------
// RECORD_layer.__$map_on_click__ = function (e) {
//     RECORD_layer.popup_show(e, e.coordinate);
// }

//------------------------------------------------------

//END module