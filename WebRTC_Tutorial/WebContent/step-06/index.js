'use strict';
// 내장모듈 os가져오기 (운영체제에 대한 정보가지고있음)
var os = require('os');
// 'node-static'모듈 가져오기 정적파일 제공하는데 사용
var nodeStatic = require('node-static');
// 내장 http 모듈 가져오기 http서버 만들고 관리
var http = require('http');
// soket.io 실시간 양방향 통신을 위한 websocket 라이브러리
var socketIO = require('socket.io');
// 정적 파일을 제공하기위한 인스턴트 생성

var fileServer = new(nodeStatic.Server)();
//HTTP 서버를 생성하고 8086 포트에서 리스닝 
//클라이언트로부터 요청을 받으면 정적 파일을 제공하기 위해 fileServer를 사용
var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(8086);
// http서버를 websocket 서버로 업그레이드하기
var io = socketIO.listen(app);
// io.sockets.on = 새로운 클라이언트 소켓이 서버에 연결될때 
//socket.on 특정 클라이언트 솧켓에서  특정 이벤트가 발생했을때.
io.sockets.on('connection', function(socket) {
// convenience function to log server messages on the client
  // 클라이언트에서 서버로 메시지 보내거나 서버에서 클라한테 보낼때 사용할 로깅함수
  function log() {
    var array = ['Message from server:'];
// array 라는 배열에 arguments 를 추가하겠다.
    array.push.apply(array, arguments);
//현재 소켓에 연결된 클라이언트에게만 이벤트 보내기
    socket.emit('log', array);
  }
// 클라이언트로부터 메시지 이벤트 수신할때마다 실행할 콜백함수
  socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
//현재 소켓을 제외한 모든 연결된 클라이언트에게 이벤트 보내기 (나를제외한 다른사용자들)
    socket.broadcast.emit('message', message);
  });
// 클라이언트로부터 create or join 이벤트 수신할때마다 실행할 콜백함수 방생성이나 참가
  socket.on('create or join', function(room) {
    log('Received request to create or join room ' + room);
// 현재 서버에 연결된 클라이언트들이 각방에 속해있는지 여부확인할수있음 
// 해당 방에 속한 크라이언트들의 정보 확인가능 방을 관리하고 그룹화하는데 사용되는 기능
    var clientsInRoom = io.sockets.adapter.rooms[room];
// clientsInRoom 이게 있으면 해당방의 인원을 뽑고 없으면 0으로 처리
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');
// 해당 방에 사람이없으면
    if (numClients === 0) {
	//그 방에 입장
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
// 그방을 만들고 고유 소켓 아이디 넘김
      socket.emit('created', room, socket.id);
    } else if (numClients === 1) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      // io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
// io.sockets.in(room) 그방에있는 모든 클라이언트를 선택 
      io.sockets.in(room).emit('ready', room);
// 나뺴고 모든 클라이언트들한테 ready 이벤트를 보내줌 .. ? ?
      socket.broadcast.emit('ready', room);
    } else { // max two clients
      socket.emit('full', room);
    }
  });
// 서버의 IP 주소를 클라이언트에게 전달 할때 실행되는 콜백함수 
  socket.on('ipaddr', function() {
	// 시스템에 연결된 모든 네트워크에 대한정보를 포함한 객체를 가져옴
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
	// 네트워크에 대한 키로 반복문 details는 한 네트워크에 대한 정보들이 들어있음 
      ifaces[dev].forEach(function(details) {
	// IPv4 이고 나 자신의 ip 주소가 아니면 ip주소를 등록한다
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });
// 클라이언트가 연결 종료할때 실행되는 콜백함수
  socket.on('disconnect', function(reason) {
    console.log(`Peer or server disconnected. Reason: ${reason}.`);
    socket.broadcast.emit('bye');
  });
//  bye 라는 이벤트 발생됬을때 콜백함수
  socket.on('bye', function(room) {
    console.log(`Peer said bye on room ${room}.`);
  });
});
