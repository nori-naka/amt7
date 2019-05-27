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
        RECORD_layer.log("position.json addOverlayer");

        setInterval(set_icon, 5000);
    }
}

function set_icon() {
    RECORD_layer.log("position.json");
    $.ajax({
        url: '/RECORD_layer/position.json',
        type: 'GET'
    }).done(function (data) {
        RECORD_layer.log("position.json GET");
        RECORD_layer.get_data(data).then(() => {
            RECORD_layer.vec_layer.getSource().clear();
            RECORD_layer.vec_layer.getSource().addFeatures(RECORD_layer.icon_features);
            RECORD_layer.log("position.json addFeature");

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
//-------------------------------------------------------------
// 
//
// sidebox_showに直接HTMLの文字列を入れる場合。
// RECORD_layer.show_detail = function(){
//     sidebox_show(RECORD_layer.detail_text);
// }
//
// sidebox_showにHTML要素を入れる場合。
// 表示したいHTML要素を作成して、本体側のsidebox_showに渡します。
// 右上の「笨普vを押して、非表示化出来ますが、
// sidebox_closeにて非表示化にします。
// 何らかのアクション後、そのまま非表示化する時にsidebox_closeを呼んで下さい。

//------------------------------------------------------------
// メニュー
//------------------------------------------------------------
// 詳細情報
RECORD_layer.elm = $("<div></div>").append('<p>詳細').append('<p>詳細').append('<p>詳細');
RECORD_layer.elm.append($('<button></button', {
    text: "更新して閉じる",
    on: {
        click: function (e) {
            alert("更新して閉じる例です。\n実際には何もしていません。")
            RECORD_layer.close_detail();
        }
    }
}));


RECORD_layer.show_menu = function () {
    $.ajax({
        url: '/RECORD_layer/michi_menu.txt',
        type: 'GET',
    }).done(function (data) {
        sidebox_show(data);
    });
}

RECORD_layer.go_edit_php = function () {
    $.ajax({
        //url: 'https://www.google.com',
        //url: 'http://182.171.89.234:8081/smapho_junkai/edit.php',
        //url: 'http://localhost:8080/edit.php',
        url: '/RECORD_layer/edit_php.txt',
        type: 'GET',
    }).done(function (data) {
        sidebox_show(data);
    })
};

RECORD_layer.show_detail = function () {
    sidebox_show(RECORD_layer.elm);
}
RECORD_layer.close_detail = function () {
    sidebox_close();
}

//-------------------------------------------------------------
// 本体側に追加するメニュー
// 
RECORD_layer.menu = {
    click: RECORD_layer.show_menu,
    icon: '/1x/menu_car@1x.png'
}
// main_menu.app.menu.RECORD_layer_menu = RECORD_layer.menu;

//-------------------------------------------------------------
// Overlay
// 下記の例はpopupの登録を行います。
// 基本的に、Overlay,interation,control等のOpenlayers由来の機能を
// 使用する場合には、それぞれの機能レイヤにて登録してください。
//
RECORD_layer.pop_elm = document.createElement('div');
RECORD_layer.pop_elm.style.marginTop = "0";
RECORD_layer.pop_elm.style.marginBottom = "1em";
RECORD_layer.pop_elm.className = "balloon2";

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

RECORD_layer.last_arr = [];
RECORD_layer.get_data = function (s) {
    var arr = JSON.parse(s);

    var new_items = [];
    arr.forEach(function (arr_item) {

        var equal_flag = false;
        RECORD_layer.last_arr.forEach(function (last_arr_item) {
            if (last_arr_item.video == arr_item.video) {
                equal_flag = true;
            }
        })
        if (!equal_flag) {
            new_items.push(arr_item);
        }

    })
    RECORD_layer.last_arr = arr;

    return new Promise(function (resolve, reject) {
        //var arr = s.split(/}\s*,\s*{/);
        new_items.forEach(function (data) {
            //var data = JSON.parse(v);

            // Featureのnameの領域に文字列化したJSONデータを埋め込み、
            // それをPopup表示の際の内容にする。
            coordinate = ol.proj.transform([parseFloat(data.経度情報), parseFloat(data.緯度情報)], "EPSG:4326", "EPSG:3857")
            var icon_feature = new ol.Feature({
                geometry: new ol.geom.Point(coordinate),
                name: JSON.stringify(data)
            });
            icon_feature.setStyle(new ol.style.Style({
                image: new ol.style.Icon({
                    anchor: [0.5, 1],
                    opacity: 1.0,
                    scale: 1.0,
                    src: '/RECORD_layer/marker-icon64.png'
                })
            }));
            RECORD_layer.detail_text = data.detail_text;
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
                        </div>`
                    } else if (key == "memo") {
                        res = res + `<div class="user">
                        <p class="text">${data[key]}</p>
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

//------------------------------------------------------
RECORD_layer.__$map_on_click__ = function (e) {
    RECORD_layer.popup_show(e, e.coordinate);
}

//------------------------------------------------------

//END module