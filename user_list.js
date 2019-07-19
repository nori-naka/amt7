//-------------------------------------------------------------------------------
// peers = {
//     id: {
//         peer: PeerConnection,
//         video_elm: video_HTML_element,
//         audio_elm: audio_HTML_element
//     },
// }    
let peers = {};
let last_list = [];
const cPING_PERIOD = 1000;
const cPING_TTL = 3;

socketio.on("user_list", function (msg) {
    const data = JSON.parse(msg);

    const $user_list = document.getElementById("user_list");
    is_serv_connectivity = true;

    Object.keys(data).forEach(function (new_id) {

        if (data[new_id].name) {
            if (document.getElementById(`id_${new_id}`)) {
                document.getElementById(`id_${new_id}`).innerText = data[new_id].name;
            }
        }

        if (!last_list.includes(new_id)) {

            last_list.push(new_id);
            if (new_id != myUid) {

                //peers[new_id] = createPeerConnection(new_id);

                let new_user = document.createElement("div");
                new_user.id = `user_${new_id}`;

                let new_user_title = document.createElement("div");
                new_user_title.id = `id_${new_id}`;
                new_user_title.innerText = new_id;
                new_user_title.classList.add("text");
                new_user_title.classList.add("child_box");
                new_user_title.classList.add("videoTitle");

                // Video HTML Element
                let new_user_video = document.createElement("video");
                new_user_video.id = `video_${new_id}`;
                new_user_video.classList.add("child_box");
                new_user_video.classList.add("no_display");
                new_user_video.setAttribute("playsinline", "");
                // new_user_video.setAttribute("autoplay", true);
                new_user_video.setAttribute("muted", true);
                peers[new_id] = {};
                peers[new_id].video_elm = new_user_video;

                // Audio HTML Element
                let new_user_audio = document.createElement("audio");
                new_user_audio.id = `audio_${new_id}`;
                peers[new_id].audio_elm = new_user_audio;

                new_user.appendChild(new_user_title);
                new_user.appendChild(new_user_video);
                new_user.appendChild(new_user_audio);

                $user_list.appendChild(new_user);

                ping(new_id, new_user_title);

                let start_type = "end";
                new_user_title.addEventListener("click", function (ev) {

                    if (!is_serv_connectivity || !peers[new_id].ping_state) return;

                    let now_receiving = false;
                    if (peers[new_id].peer) {
                        peers[new_id].peer.getReceivers().forEach(function (receiver) {
                            if (receiver.track && receiver.track.kind == "video") {
                                now_receiving = true;
                                return;
                            }
                        });
                    }

                    if (now_receiving) {
                        // 映像着信中なので、切断する。
                        start_type = "end";
                    } else {
                        // 映像未着信なので、接続する。
                        start_type = "start";
                    }

                    socketio.emit("start", JSON.stringify({
                        type: start_type,
                        dest: new_id,
                        src: myUid,
                    }));
                    is_serv_connectivity = false;
                })
            }
        }
    })

    // ひとつ前のlast_listに示されるユーザがdata（サーバから通知されたユーザリスト）に
    // 含まれない場合には、削除対象（delete_user）となり、last_list、及び画面上の一連のvideoタグ等が
    // 削除される。（ただし、peerのiceConnecteState、signalingStateが切断状態である事が条件)

    last_list.forEach(function (last_list_item, index) {
        if (!Object.keys(data).includes(last_list_item)) {

            last_list.splice(index, 1);

            clearInterval(peers[last_list_item].ping_id);

            const delete_user = document.getElementById(`user_${last_list_item}`);
            while (delete_user.firstChild) delete_user.removeChild(delete_user.firstChild);
            $user_list.removeChild(document.getElementById(`user_${last_list_item}`));

        }
    })
});

setInterval(function () {
    socketio.emit("user_list", JSON.stringify(
        {
            id: myUid,
            group_id: group_id,
            name: user_name
        })
    )
}, 5000);

socketio.on("remote_connect", function (msg) {
    if (!msg) return;
    const data = JSON.parse(msg);

    if (data.dest == myUid) {
        if (data.type == "reply") {
            peers[data.src].ping_ttl = cPING_TTL;
        } else if (data.type == "request") {
            socketio.emit("remote_connect", JSON.stringify({
                type: "reply",
                dest: data.src,
                src: myUid
            }));
        }
    }
})


const ping = function (id, title_elm) {
    // PING to remote peer
    peers[id].ping_ttl = cPING_TTL;
    peers[id].ping_state = true;
    peers[id].ping_id = setInterval(function () {

        socketio.emit("remote_connect", JSON.stringify({
            type: "request",
            dest: id,
            src: myUid
        }));

        peers[id].ping_ttl--;
        console.log(`peers[${id}].ping_ttl = ${peers[id].ping_ttl}`);

        if (peers[id].ping_ttl < 0) {
            peers[id].ping_state = false;
            peers[id].ping_ttl = -1;
            title_elm.classList.add("gray_background");
        } else {
            peers[id].ping_state = true;
            title_elm.classList.remove("gray_background");
        }

    }, cPING_PERIOD);
}