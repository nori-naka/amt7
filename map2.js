var map;
var mapView;
const zoomVal = 14;
const mapCenterCoord = [140.034635, 35.648209]; //幕張メッセ イベントホール

var users = {};
var layers = {};

const buttonBlue = "#38a2c0";//rgb(56, 162, 192)
const buttonRed = "#c03838";
const buttonGray = "#bebebe";

// login daialog
var user_name = null;

var input_name = function () {
    var $input_name = document.getElementById("input_name");
    var $name_ok_btn = document.getElementById("name_ok_btn");
    var $name = document.getElementById("name");

    $input_name.style.display = "block";
    var input_name_change = function () {
        if ($name.value != "") {
            user_name = $name.value;
            document.getElementById("myVideoTitle").innerText = user_name;
        } else {
            user_name = myUid;
        }
        $input_name.style.display = "none";
    }
    $name_ok_btn.addEventListener("click", input_name_change);
    $input_name.addEventListener("keydown", function (e) {
        if (e.keyCode == 13) input_name_change();
    });

}
input_name();


function showMap() {

    // メインレイヤー
    mainMapLayer = new ol.layer.Tile({
        /*
        source: new ol.source.XYZ({
            //url: 'https://mt1.google.com/vt/lyrs=m@113&hl=en&&x={x}&y={y}&z={z}&hl=ja&gl=JP'
            //url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
            //url: 'https://tile.openstreetmap.jp/{z}/{x}/{y}.png',
            //url: 'https://localhost:10443/OpenStreetMap/{z}/{x}/{y}.png'
            url: '/OpenStreetMap/{z}/{x}/{y}.png',
            attributions: [new ol.Attribution({
                //html: '&copy;OpenStreetMap contributors.',
                html: '&copy;<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors.',
                left: "50px"
            })]
        }),
        */
        source: new ol.source.OSM(),
        opacity: 1,
        visible: true,
        //preload: Infinity,
    });

    // アイコンレイヤー
    var iconMapStyleFunction = function (feature) {
        var style = [
            new ol.style.Style({
                image: new ol.style.Icon({
                    //src: feature.get("sel") ? "pic/map/location_circle@0,5x.png" : "pic/map/location_people@0,5x.png",
                    src: getLocationIcon(feature.get("location")),
                    scale: 1.0,
                    anchor: [0.5, 0.5]
                }),
                text: new ol.style.Text({
                    fill: new ol.style.Fill({ color: "#ff0000" }),
                    stroke: new ol.style.Stroke({ color: "#ffffff", width: 3 }),
                    //scale: 1.6,
                    textAlign: "center",
                    textBaseline: "top",
                    offsetY: 13,
                    text: feature.get("id"),
                    font: "bold 15px Courier New, monospace"
                })
            })
        ];
        return style;
    };
    var iconFeatures = [];
    //setUsersIcon(users, iconFeatures);
    Object.keys(users).forEach(function (userId) {
        const iconPoint = (new ol.geom.Point([users[userId].lng, users[userId].lat])).transform('EPSG:4326', 'EPSG:3857');
        iconFeatures.push(new ol.Feature({
            geometry: iconPoint,
            name: "icon",
            id: userId,
            //sel: userId == myUid ? true : false,
            location: getLocation(userId),
        }));
    });
    var iconSource = new ol.source.Vector({
        features: iconFeatures
    });
    iconLayer = new ol.layer.Vector({
        source: iconSource,
        style: iconMapStyleFunction,
        opacity: 1,
        visible: true,
    });

    //ナウキャスト
    nowcastLayer = new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: "https://wms.jmarinecloud.com/ms4w/htdocs/direction_raster.php",
            params: {
                LAYERS: "area_02",
                TRANSPARENT: true,
                FORMAT: "image/png",
                KIND: "nowcast_hi",
                VERSION: "1.1.1",
                tm: new Date().getMilliseconds(),
            },
            visibility: true,
        })
    })

    // 天気図レイヤー
    var weatherMapStyleFunction = function (feature) {
        let angle = feature.get("direction");
        var style = [
            new ol.style.Style({
                image: new ol.style.Icon({
                    src: feature.get("icon"),
                    //scale: 0.6,
                    anchor: [0.5, 0.5]
                }),
                text: new ol.style.Text({
                    fill: new ol.style.Fill({ color: "#000000" }),
                    stroke: new ol.style.Stroke({ color: "#ffffff", width: 3 }),
                    //scale: 1.6,
                    textAlign: "center",
                    textBaseline: "top",
                    offsetX: angle < 180 ? -30 : 30,
                    offsetY: -5,
                    text: feature.get("label"),
                    font: "bold 15px Courier New, monospace"
                })
            }),
            new ol.style.Style({
                image: new ol.style.Icon({
                    src: feature.get("direction_icon"),
                    //scale: 0.6,
                    anchor: [0.5, 1.6],
                    rotation: Math.PI * angle / 180
                }),
                text: new ol.style.Text({
                    fill: new ol.style.Fill({ color: "#000000" }),
                    stroke: new ol.style.Stroke({ color: "#ffffff", width: 3 }),
                    //scale: 1.6,
                    textAlign: "center",
                    textBaseline: "top",
                    offsetY: 90 < angle && angle < 270 ? -25 : 15,
                    text: feature.get("direction_label"),
                    font: "bold 15px Courier New, monospace"
                })
            }),
        ];
        return style;
    };
    var weatherFeatures = [];
    var weatherSource = new ol.source.Vector({
        features: weatherFeatures
    });
    weatherLayer = new ol.layer.Vector({
        source: weatherSource,
        style: weatherMapStyleFunction,
        opacity: 1.0,
        visible: true,
    });

    //等圧線
    isoLayer = new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: "https://wms.jmarinecloud.com/ms4w/htdocs/weather.php",
            params: {
                LAYERS: "isobar",
                TRANSPARENT: true,
                FORMAT: "image/png",
                VERSION: "1.1.1",
                tm: new Date().getMilliseconds(),
                //'_' : (new Date).getTime(),
            },
            visibility: true,
        })
    })

    //前線
    frontLayer = new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: "https://wms.jmarinecloud.com/ms4w/htdocs/weather.php",
            params: {
                LAYERS: "front",
                TRANSPARENT: true,
                FORMAT: "image/png",
                VERSION: "1.1.1",
                tm: new Date().getMilliseconds(),
                //'_' : (new Date).getTime(),
            },
            visibility: true,
        })
    })


    // 台風ベクタ
    var typhoonMapStyleFunction = function (feature) {
        var style = [
            new ol.style.Style({
                image: new ol.style.Icon({
                    src: feature.get("icon"),
                    anchor: [0.5, 0.5]
                }),
                text: new ol.style.Text({
                    fill: new ol.style.Fill({ color: "#000000" }),
                    stroke: new ol.style.Stroke({ color: "#ffffff", width: 3 }),
                    //scale: 1.6,
                    textAlign: "center",
                    textBaseline: "top",
                    offsetY: 15,
                    text: feature.get("label"),
                    font: "bold 15px Courier New, monospace"
                })
            })
        ];
        return style;
    };
    var typhoonFeatures = [];
    var typhoonSource = new ol.source.Vector({
        features: typhoonFeatures
    });
    typhoonLayer = new ol.layer.Vector({
        source: typhoonSource,
        style: typhoonMapStyleFunction,
        opacity: 1.0,
        visible: true,
    });

    //台風タイル
    typhoonTileLayer = new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: "https://wms.jmarinecloud.com/ms4w/htdocs/typhoon.php",
            params: {
                LAYERS: "typhoon_forecast_circle,typhoon_forecast_line,typhoon_track,typhoon_gale_now,typhoon_wind_now,typhoon_forecast_area,data_forecast_point,typhoon_stm_area",
                TRANSPARENT: true,
                FORMAT: "image/png",
                VERSION: "1.1.1",
                //'_' : (new Date).getTime(),
                TIME: 24,
                COUNT: 2,
                tm: new Date().getMilliseconds(),
            },
            visibility: true,
        })
    })

    //
    hazerdMapLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_kuni_data/{z}/{x}/{y}.png'
        }),
        opacity: 1,
        visible: false
    });

    //手書きレイヤー
    initDrawLayer();

    //消去用レイヤー
    initFreeEraseLayer();

    // viewを生成する
    mapView = new ol.View({
        projection: "EPSG:3857",
        center: ol.proj.transform(mapCenterCoord, "EPSG:4326", "EPSG:3857"),
        zoom: zoomVal
    });

    // mapを生成する
    map = new ol.Map({
        target: 'map',
        layers:
            [
                mainMapLayer,
                hazerdMapLayer,
                nowcastLayer,
                isoLayer,
                frontLayer,
                typhoonTileLayer,
                iconLayer,
                weatherLayer,
                typhoonLayer,
                drawLayer,
                freeEraseLayer
            ],
        view: mapView,
        controls: ol.control.defaults({
            zoom: false,
            attribution: true,
            attributionOptions: /** @type {ol.control.ScaleLineUnits} */ ({
                collapsible: true,
                left: "30px"
            }),
            rotate: false
        }),
        //.extend([new ol.control.ScaleLine()])
        interactions:
            ol.interaction.defaults({
                altShiftDragRotate: false,
                pinchRotate: false
            })
    });

    //setWeatherFeatures();
    readWeatherIcon("pressure");
    readWeatherIcon("typhoon");

    // ol.interaction.Draw の追加
    initDraw();
    initFreeErase();

    var undo_func = null;
    map.on("click", function (e) {

        if (eraseMode) {
            eraseNearest(e.coordinate);
            return;
        }
        if (sizeMode) {
            sizeBtnEnd();
            return;
        }

        if (undo_func) {
            undo_func();
            undo_func = null;
        }

        LOG(`now click position = ${ol.proj.transform([e.coordinate[0], e.coordinate[1]], "EPSG:3857", "EPSG:4326")}`);

        Object.keys(layers).forEach(function (layer) {
            try {
                if (layers[layer].__$map_on_click__) {
                    layers[layer].__$map_on_click__(e);
                    undo_func = layers[layer].__$end_click__;
                }
            } catch (e) {
                console.log(e);
            }
        })

        map.forEachFeatureAtPixel(e.pixel, function (feature, layer) {

            if (feature.__$do_func__ != null) {
                feature.__$do_func__(e);
                undo_func = feature.__$undo_func__;
            }
        });
    });

    let drawX;
    let drawY;

    map.on("pointerdrag", function (e) {
        if (eraseMode) {
            // const coords = ol.proj.toLonLat(e.coordinate);
            // const lon = coords[0];
            // const lat = coords[1];
            // const x = e.pixel[0];
            // const y = e.pixel[1];
            //console.log("pointerdrag lon=" + lon + ", lat=" + lat + ", x=" + x + ", y=", y);
            eraseNearest(e.coordinate);
            //return false;
        } else if (writeMode) {
            // if (multiTouch) {
            //     return false;
            // }
            const x = e.pixel[0];
            const y = e.pixel[1];
            if (drawStartFlag) {
                drawX = e.pixel[0];
                drawY = e.pixel[1];
                drawStartFlag = false;
            } else {
                const xDiff = e.pixel[0] - drawX;
                const yDiff = e.pixel[1] - drawY;
                if (multiTouch && Math.sqrt(xDiff * xDiff + yDiff * yDiff) > 50) {
                    return false;
                } else {
                    drawX = e.pixel[0];
                    drawY = e.pixel[1];
                }
            }
        }
    });

    setInterval(function () {
        if (nowcastLayer.getVisible()) {
            refreshNowcast();
        }
        if (weatherLayer.getVisible()) {
            refreshWeather();
        }
        if (typhoonLayer.getVisible()) {
            refreshTyhoon();
        }
    }, refreshSecond * 1000);
}


