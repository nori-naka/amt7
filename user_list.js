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


socketio.on("user_list", function (msg) {
    const data = JSON.parse(msg);

    const $user_list = document.getElementById("user_list");

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
                new_user_title.classList.add("title");

                // Video HTML Element
                let new_user_video = document.createElement("video");
                new_user_video.id = `video_${new_id}`;
                new_user_video.classList.add("child_box");
                new_user_video.classList.add("no_display");
                new_user_video.setAttribute("playsinline", "");
                new_user_video.setAttribute("autoplay", true);
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

                let start_type = "end"
                new_user_title.addEventListener("click", function (ev) {

                    if (start_type == "start") {
                        start_type = "end";
                        // new_user_video.classList.add("no_display");
                        peers[new_id].peer.getRemoteStreams()[0].getVideoTracks().forEach(function (track) {
                            track.stop();
                        });
                    } else {
                        start_type = "start";
                        // new_user_video.classList.remove("no_display");
                    }
                    socketio.emit("start", JSON.stringify({
                        type: start_type,
                        dest: new_id,
                        src: myUid,
                    }));
                })
            }
        }
    })

    // ひとつ前のlast_listに示されるユーザがdata（サーバから通知されたユーザリスト）に
    // 含まれない場合には、削除対象（delete_user）となり、last_list、及び画面上の一連のvideoタグ等が
    // 削除される。（ただし、peerのiceConnecteState、signalingStateが切断状態である事が条件)

    last_list.forEach(function (last_list_item, index) {
        if (!Object.keys(data).includes(last_list_item)) {

            // peerがあるという事は接続実績がある、と言う事。
            if (peers[last_list_item].peer) {
                if (peers[last_list_item].peer.iceConnectionState == "disconnected" || peers[last_list_item].peer.signalingState == "closed") {

                    last_list.splice(index, 1);

                    const delete_user = document.getElementById(`user_${last_list_item}`);
                    while (delete_user.firstChild) delete_user.removeChild(delete_user.firstChild);
                    $user_list.removeChild(document.getElementById(`user_${last_list_item}`));

                    delete peers[last_list_item].peer;
                    delete peers[last_list_item].video_elm;
                    delete peers[last_list_item].audio_elm;
                    delete peers[last_list_item];

                }
            } else {
                last_list.splice(index, 1);

                const delete_user = document.getElementById(`user_${last_list_item}`);
                while (delete_user.firstChild) delete_user.removeChild(delete_user.firstChild);
                $user_list.removeChild(document.getElementById(`user_${last_list_item}`));

            }

        }
    })
});

setInterval(function () {
    socketio.emit("user_list", JSON.stringify(
        {
            id: myUid,
            name: user_name
        })
    )
}, 5000);
