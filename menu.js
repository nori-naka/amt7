function addMenu(id, name) {

    var child_item = $("<div>", { id: `video_${id}` });
    if (name) {
        var $menu = $("<div>", { class: "videoTitle", id: `menu_${id}` }).text(name);
    } else {
        var $menu = $("<div>", { class: "videoTitle", id: `menu_${id}` }).text(id);
    }

    $menu.on("click", function () {
        if (!users[id] || !users[id].cam) {
            alert("カメラが接続されていません。")
        }
        else if (remote_peers[id] && remote_peers[id].myActive) {
            console.log(`WATCH END FROM MENU id = ${id}`);
            watchEnd(id);
        }
        else {
            console.log(`WATCH START FROM MENU id = ${id}`);
            watchStart(id);
        }

        // if (remoteVideoElms[id] == null){
        //     setTimeout(function(){
        //         $(this).next().slideToggle();
        //     }, 2000);
        // } else {
        //     $(this).next().slideToggle();
        // }
    });
    $("#remote").append($menu).append(child_item);
};

function changeMenu_name(id, name) {
    $(`#menu_${id}`).text(name);
}

function delMenu(id) {
    $(`#video_${id}`).empty();
    $(`#video_${id}`).remove();
    $(`#menu_${id}`).remove();
};

function addVideo(id, content_elem) {
    $(`#video_${id}`).empty();
    $(`#video_${id}`).append(content_elem);
}

function delVideo(id) {
    $(`#video_${id}`).empty();
}

$("#remote").on("DOMSubtreeModified propertychange", function () {
    //alert($("#remote").height());
    // setRemoteBox();
});

var videoWidth;

function setVideoSize() {
    if (screen.width * 0.35 >= 320) {
        videoWidth = 320;
    } else {
        videoWidth = screen.width * 0.35;
    }
    $("#localBox").width(videoWidth);
    $("#local_video").width(videoWidth);
    $("#remote").width(videoWidth);
    const wid = window.innerWidth < screen.width ? window.innerWidth : screen.width;
    $("#remotoBox").css({ left: (wid - videoWidth) + "px" });
}

function setRemoteBox() {
    const wid = window.innerWidth > screen.width ? window.innerWidth : screen.width;
    const leftPos = (wid - videoWidth) + "px";
    $("#remote").width(videoWidth);
    if ($("#remote").height() > window.innerHeight) {
        //let leftPos = window.innerWidth - $("#remoteBox").width() - 12 - 2;
        //let leftPos = window.innerWidth - $("#remoteBox").width();
        $("#remoteBox").css({ height: "100%", left: leftPos });
    } else {
        //let leftPos = window.innerWidth - $("#remoteBox").width() - 2;
        //let leftPos = window.innerWidth - $("#remoteBox").width();
        $("#remoteBox").css({ height: "auto", left: leftPos })
    }
}

