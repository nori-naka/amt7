// ------ Vender Prefix ------
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL;
window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTPCSessionDescription;
window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate;

var isIOS = /iP(hone|(o|a)d)/.test(navigator.userAgent)

var localStream = null;
var localVideoElm = document.getElementById("local_video");

var remoteVideoElms = {};

var newRemoteVideoElm = function (id) {
    var video_elem = document.createElement("video");
    //video_elem.muted = true;
    video_elem.setAttribute("playsinline", true);
    // video_elem.width = videoWidth; //"320";
    // video_elem.style.width = "100%"; //"320";
    video_elem.classList.add("remote_video");
    video_elem.autoplay = true;
    video_elem.muted = false;
    //video_elem.controls = true;
    video_elem.onclick = function () {
        if (this.webkitDisplayingFullscreen) {
            if (document.webkitCancelFullScreen) document.webkitCancelFullScreen();
            else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
            else alert("NOT SUPPORT FULL SCREEN");
        }
        else {
            if (this.webkitRequestFullScreen) this.webkitRequestFullScreen();
            else if (this.mozRequestFullScreen) this.mozRequestFullScreen();
            else alert("NOT SUPPORT FULL SCREEN");
        }
    };
    //video_elem.id = "video_"+id;
    video_elem.id = id;
    //document.body.appendChild(video_elem);
    return video_elem;
}


var socketio = io.connect();
//-------------------------------------------------------------------------------
//  remote_peers = {id:remote_peer, ....};
//     id          :宛先id(dest)
//     remote_peer :宛先id毎のremote_peerインスタンス
//------------------------------------------------------------------------------
var remote_peers = {};
var myUid;

function regist(myUid) {
    //myUid = name;
    socketio.emit("regist", myUid);

    //socketio.emit('regist', JSON.stringify({'peerid': null}));
}

function sendTo(msg) {
    socketio.emit("publish", msg);
}

//-------------------------------------------------------------------------------
// P2P 
// 
function P2P(dest, side, myActive, yourActive) {
    this.dest = dest;
    this.peer;
    this.side = side;  // side: "Offer" or "Answer"
    this.myActive = myActive;
    this.yourActive = yourActive;
    this.connectedFlg = false;

    var self = this;

    this.peer = new RTCPeerConnection(
        {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:23.21.150.121' }
            ]
        }
    );

    if (yourActive) {
        this.peer.addStream(localStream);       //!! Deprecated !!
        //localStream.getTracks().forEach(function(track) {
        //    self.peer.addTrack(track, localStream);
        //});
    }

    this.peer.onicecandidate = function (e) {
        self.onicecandidate(e);
    }

    this.peer.onaddstream = function (e) {       //!! Deprecated !!
        //this.peer.ontrack = function(e) {
        self.onaddstream(e)
    };

    this.peer.onremovestream = function (e) {
        self.onremovestream(e);
    }

    this.peer.oniceconnectionstatechange = function () {
        if (self.peer) {
            self.oniceconnectionstatechange();
        } else {
            console.log('ICE Connection STATE = .... u~n~... pc is null!');
        }
    };

    this.peer.onnegotiationneeded = function () {
        console.log("ON NEGOTIATION NEEDED");
    }

}

// 候補
P2P.prototype.onicecandidate = function (e) {
    if (!e.candidate) {
        // Candidateが全部終了
        console.log(`END-CANDIDATE: ${e.candidate}`);
    } else {
        //console.log(`GET-CANDIDATE: ${e.candidate}`);
        this._candidate = e.candidate;
        var msg = {
            type: "candidate",
            dest: this.dest,
            src: myUid,
            candidate: this._candidate
        };
        // SEND CANDIDATE local -> remote

        sendTo(JSON.stringify(msg));
        //console.log("SEND CANDIDATE dest=" + msg.dest + "\nCANDIDATE=" + JSON.stringify(msg.candidate));
    }
}

// ストリーム追加コールバック
P2P.prototype.onaddstream = function (e) {
    remoteVideoElms[this.dest].srcObject = e.stream;
    //remoteVideoElms[this.dest].srcObject = e.streams[0];
    //addVideo(this.dest, remoteVideoElms[this.dest]);
    console.log("EVENT onaddstream:" + e.toString());
}

P2P.prototype.onremovestream = function (e) {
    console.log("EVENT onremovestream:" + e.toString());
    e.stream.getTracks().forEach(function (track) {
        track.stop();
    });
    delVideo(this.dest);

    // 最後に呼び出し側のcallbackを実行する。
    //if(self.on_close) self.on_close();
}

P2P.prototype.oniceconnectionstatechange = function () {
    //self.on_ice_state(self.peer.iceConnectionState);
    console.log('ICE Connection STATE=' + this.peer.iceConnectionState);
    switch (this.peer.iceConnectionState) {
        case 'closed':
        case 'dissconnected':
            enableButton();
            break;
        case 'failed':
            //this.close();
            deletePcElm(this.dest);
            delVideo(this.dest);
            enableButton();
            break;
        case 'connected':
            if (this.myActive && !this.connectedFlg) {
                addVideo(this.dest, remoteVideoElms[this.dest]);
            }
            connectedFlg = true;
            enableButton();
            break;
    }
}

// OFFER START
P2P.prototype.offerStart = function (myActive, yourActive) {
    const p2pSelf = this;
    let options = {};
    if (myActive && !yourActive) {
        options = { offerToReceiveVideo: true };
    } else if (!myActive && yourActive) {
        options = { offerToReceiveVideo: false };
    }
    this.peer.createOffer(options)
        .then(function (sessionDescription) {
            return p2pSelf.peer.setLocalDescription(sessionDescription);
        })
        .then(function () {
            const msg = {
                "type": "offer",
                "dest": p2pSelf.dest,
                "src": myUid,
                "sdp": p2pSelf.peer.localDescription,
                "myActive": myActive,
                "yourActive": yourActive
            };
            // SEND SDP :local -> remote
            sendTo(JSON.stringify(msg));
            //console.log("OFFERD SDP: " + JSON.stringify(p2pSelf.peer.localDescription));
        })
        .catch(function (error) {
            console.log(error.name + ':' + error.message);
        });
};

function deletePcElm(id) {
    if (remoteVideoElms[id]) {
        if (remoteVideoElms[id].srcObject) {
            remoteVideoElms[id].srcObject.getTracks().forEach(t => t.stop());
        }
        remoteVideoElms[id] = null;
        delete remoteVideoElms[id];
    }
    const oldPeer = remote_peers[id];
    if (oldPeer) {
        oldPeer.peer.close();
        oldPeer.peer = null;
        delete remote_peers[id];
    }
}

P2P.prototype.close = function (localOnly) {
    if (!localOnly) {
        console.log("CLOSE(local&remote)");
        sendTo(JSON.stringify({ type: "close", dest: this.dest, src: myUid }));
    } else {
        console.log("CLOSE(local)");
    }
    deletePcElm(this.dest);
    delVideo(this.dest);
}

// 終了の通知
function onClose(msg) {
    console.log("ON CLOSE: " + msg);
    var data = JSON.parse(msg);

    deletePcElm(data.src);
    delVideo(data.src);
}

// 他のユーザーが切断
socketio.on("user_disconnect", function (msg) {
    console.log("SOCKET ON DISCONNECT: " + msg);
    var data = JSON.parse(msg);
    deleteUser(data.id);
});

// ユーザー削除
function deleteUser(id) {
    try {
        console.log("DELETE USER: " + id);
        deletePcElm(id);
        delMenu(id);
        deleteUserIcon(id);
    } catch (e) {
        console.log(e);
    }
}

// 視聴開始
function watchStart(dest) {
    if (!buttonEnable) return;

    const remote_peer = remote_peers[dest];
    if (remote_peer) {
        if (!remote_peer.myActive && remote_peer.yourActive) {
            offer(dest, true, true);
            return;
        }
    } else {
        offer(dest, true, false);
    }
}

// 視聴終了
function watchEnd(dest) {
    if (!buttonEnable) return;

    const remote_peer = remote_peers[dest];
    if (remote_peer) {
        if (remote_peer.myActive && remote_peer.yourActive) {
            remote_peer.close(true);
            offer(dest, false, true);
        }
        else if (remote_peer.myActive) {
            remote_peer.close();
        }
    }
}

// OFFER
// (1) OfferSide (OfferSide -> "publish:offer"+SDP -> AnswerSide)
function offer(dest, myActive, yourActive) {
    disableButton();

    deletePcElm(dest);

    remoteVideoElms[dest] = newRemoteVideoElm(dest);
    remote_peers[dest] = new P2P(dest, "Offer", myActive, yourActive);
    remote_peers[dest].offerStart(myActive, yourActive);
    console.log("OFFER_START: DEST= " + dest);
}

// ANSER
// (2) AnswerSide (OfferSide -> "publish:offer"+SDP -> AnswerSide -> "publish:answer"+SDP -> OfferSide )
// 相手情報の設置をまず行なう
function onOffer(msg) {
    var data = JSON.parse(msg);
    // dataは着信データのため、distがこちら側を指し、srcが対向先を示す。
    if (!data.sdp) {
        console.log("RECV: NO SDP");
        return;
    } else {
        disableButton();

        console.log("RECV: SDP");

        deletePcElm(data.src);

        if (remote_peers[data.src] && remoteVideoElms[data.src]) {
            remote_peers[data.src].side = "Answer";
            remote_peers[data.src].myActive = data.yourActive;
            remote_peers[data.src].yourActive = data.myActive;
            if (data.myActive) {
                remote_peers[data.src].peer.addStream(localStream);       //!! Deprecated !!
                //localStream.getTracks().forEach(function(track) {
                //    self.peer.addTrack(track, localStream);
                //});
            }
        } else {
            remote_peers[data.src] = new P2P(data.src, "Answer", data.yourActive, data.myActive);
            remoteVideoElms[data.src] = newRemoteVideoElm(data.src);
        }

        let pc = remote_peers[data.src].peer;
        var remote_sdp = new RTCSessionDescription(data.sdp);
        //console.log("SET REMOTE_DESCRIPTION (ANSWESIDE): " + JSON.stringify(remote_sdp));
        pc.setRemoteDescription(remote_sdp).then(function () {
            return pc.createAnswer();
        }).then(function (answer) {
            return pc.setLocalDescription(answer);
        }).then(function () {
            var msg = {
                type: "answer",
                dest: data.src,
                src: myUid,
                sdp: pc.localDescription
            };
            // SEND ANSWER :local -> remote
            sendTo(JSON.stringify(msg));
            //enableButton();
        }).catch(function (error) {
            console.log(error.name + ':' + error.message);
            enableButton();
        });

    }
};

// (3) OfferSide (AnswerSide -> "publish:answer"+SDP -> OfferSide)
// 相手情報の設定
function onAnswer(msg) {
    var data = JSON.parse(msg);
    if (!data.sdp) {
        console.log("RECV: NO ANSWER");
        enableButton();
    } else {
        console.log("RECV: ANSWER");
        //remote_peers[data.src].peer.setRemoteDescription(new RTCSessionDescription(data.sdp))
        const remote_sdp = new RTCSessionDescription(data.sdp);
        //console.log("SET REMOTE_DESCRIPTION (OFFERSIDE): " + JSON.stringify(remote_sdp));
        remote_peers[data.src].peer.setRemoteDescription(remote_sdp)
            .then(function () {
                console.log("RECV: ANSWER -> setRemoteDescription");
                //enableButton();
            })
            .catch(function (error) {
                console.log("RECV: ANSWER -> setRemoteDescription ERROR: " + error);
                enableButton();
            });
    }
};

//RECIVE CANDIDATE
//AnswerSide, OfferSide
function onCandidate(msg) {
    var data = JSON.parse(msg);
    if (!data.candidate) {
        console.log("RECV: NO CANDIDATE");
        return;
    } else {
        console.log("RECV: CANDIDATE");
        //console.log("RECV: CANDIDATE for " + data.src + " " + JSON.stringify(data.candidate));
        remote_peers[data.src].peer.addIceCandidate(new RTCIceCandidate(data.candidate))
            .catch(function (e) { console.log(`addIceCandidate-error=${e}`) });
    }
};

//RECIVE NO_DATA
function onNop(msg) {
    console.log("RECVE: NO DATA");
};

var branch = {
    //'request'   : onRequest,
    'offer': onOffer,
    'answer': onAnswer,
    'candidate': onCandidate,
    'NO DATA': onNop,
    'close': onClose,
}

socketio.on("publish", function (msg) {
    var data = JSON.parse(msg);
    if (branch[data.type]) {
        branch[data.type](msg);
    }
});

// var socketio = io.connect()のコールバック(?)
// registを実行（socketio.emit("regist", myUid)）し、
// 自分のIDを全員に知らせる
socketio.on("connect", function (msg) {
    //alert(`${myUid}として接続します。`);
    setTimeout(function () {
        regist(myUid);
    }, 2000);
});

// registまでは、msg.idで着信する。
// 他の人が登録した -
socketio.on("regist", function (msg) {
    console.log("SOCKET ON REGIST: " + msg);

    const data = JSON.parse(msg);
    const id = data.id;
    if (id != null && id in remote_peers &&
        (remote_peers[id].myActive || remote_peers[id].yourActive)) {
        // 再登録のときVideo再開
        offer(id, remote_peers[id].myActive, remote_peers[id].yourActive);
    }
});


//-------------------------------------------------------------------------------
var user_constraints = {
    video: {
        facingMode: "user",
        width: 320,
        // height: 480,
        frameRate: { min: 1, max: 10 },
    },
    audio: true
};

var hide_constraints = {
    video: {
        facingMode: "environment",
        width: 320,
        // height: 480,
        frameRate: { min: 1, max: 10 },
    },
    audio: true
};

var local_recorder = null;
var $rec_btn = document.getElementById("rec_btn");

function p2pInit(uid, constraints) {

    if (!constraints) {
        constraints = user_constraints;
    }

    // Local Video START
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function (stream) {
            localStream = stream;
            localVideoElm.srcObject = localStream;
            localVideoElm.play();        //必要
            myCamera = true;
            socketio.emit("camera", JSON.stringify({ id: myUid, cam: myCamera }));

            local_recorder = new Record(localStream, myUid, $rec_btn);

            LOG(`AUDIO SETTING=${JSON.stringify(localStream.getAudioTracks()[0].getSettings(), null, 4)}`);
            LOG(`VIDEO SETTING=${JSON.stringify(localStream.getVideoTracks()[0].getSettings(), null, 4)}`);
        })
        .catch(function (error) {
            //myCamera = false;
            socketio.emit("camera", JSON.stringify({ id: uid, cam: myCamera }));
            console.log('ERROR: ' + error);
        });
}

var face_flag = true;

function videoToggle() {
    if (!localStream) {
        return;
    }
    localStream.getTracks().forEach(t => t.stop());

    setTimeout(function () {
        let constraints;
        if (face_flag) {
            face_flag = false;
            constraints = hide_constraints;
        } else {
            face_flag = true;
            constraints = user_constraints;
        }
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function (stream) {
                localStream = stream;
                localVideoElm.srcObject = localStream;
                localVideoElm.play();        //必要

                local_recorder.remove();
                local_recorder = new Record(localStream, myUid, $rec_btn);

                LOG(`AUDIO SETTING=${JSON.stringify(localStream.getAudioTracks()[0].getSettings())}`);
                LOG(`VIDEO SETTING=${JSON.stringify(localStream.getVideoTracks()[0].getSettings())}`);

                setTimeout(function () {
                    Object.keys(remote_peers).forEach(function (id) {
                        const peer = remote_peers[id];
                        peer.peer.getSenders().forEach(sender =>
                            sender.replaceTrack(localStream.getTracks()[0])
                        );
                    });
                }, 1000);
            })
            .catch(function (error) {
                myCamera = false;
                socketio.emit("camera", JSON.stringify({ id: myUid, cam: myCamera }));
                console.log('ERROR: ' + error);
            });

    }, 1000);
}

localVideoElm.addEventListener('click', function (e) {
    videoToggle();
});

$("video").on("loadedmetadata", function () {
    console.log("VIDEOSIZE ID=" + this.id + ", W=" + this.videoWidth + ", H=" + this.videoHeight);
})

$("video").on("resize", function () {
    console.log("VIDEOSIZE(R) ID=" + this.id + ", W=" + this.videoWidth + ", H=" + this.videoHeight);
})

/// button Enable/Disable

var buttonEnable = true;
var buttonEnableTimerId = null;

function disableButton() {
    if (buttonEnableTimerId != null) {
        clearTimeout(buttonEnableTimerId);
        buttonEnableTimerId = null;
    }
    buttonEnable = false;
    buttonEnableTimerId = setTimeout(function () {
        buttonEnableTimerId = null;
        buttonEnable = true;
    }, 5000);
}

function enableButton() {
    if (buttonEnableTimerId != null) {
        clearTimeout(buttonEnableTimerId);
        buttonEnableTimerId = null;
    }
    buttonEnable = true;
}