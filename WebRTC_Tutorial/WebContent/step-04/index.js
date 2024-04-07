'use strict';

var os = require('os'); // 내장모듈 os가져오기 (운영체제에 대한 정보가지고있음)
var nodeStatic = require('node-static'); // 'node-static'모듈 가져오기 정적파일 제공하는데 사용
var http = require('http'); // 내장 http 모듈 가져오기 http서버 만들고 관리
var socketIO = require('socket.io'); // soket.io 실시간 양방향 통신을 위한 websocket 라이브러리

var fileServer = new(nodeStatic.Server)(); // 정적 파일을 제공하기위한 인스턴트 생성
//HTTP 서버를 생성하고 8084 포트에서 리스닝 
  //클라이언트로부터 요청을 받으면 정적 파일을 제공하기 위해 fileServer를 사용
var app = http.createServer(function(req, res) { 
  fileServer.serve(req, res);
}).listen(8084);
// http서버를 websocket 서버로 업그레이드하기
var io = socketIO.listen(app);
// 클라이언트가 소켓에 연결될 때마다 실행할 콜백 함수를 정의
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  // 클라이언트에서 서버로 메시지 보내거나 서버에서 클라한테 보낼때 사용할 로깅함수
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }
// 클라이언트로부터 메시지 이벤트 수신할때마다 실행할 콜백함수
  socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });
// 클라이언트로부터 create or join 이벤트 수신할때마다 실행할 콜백함수 방생성이나 참가
  socket.on('create or join', function(room) {
    log('Received request to create or join room ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);

    } else if (numClients === 1) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
    } else { // max two clients
      socket.emit('full', room);
    }
  });
// 서버의 IP 주소를 클라이언트에게 전달 할때 실행되는 콜백함수 
  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

});
