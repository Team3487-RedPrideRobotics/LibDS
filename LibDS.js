//TODO Actually writing the software.
'use strict';

const dgram = require("dgram");
const robot_server = dgram.createSocket('udp4');

var protocol;
var robotTimer;

/**
 * Robot Stuff
 */
function bind_robot_server() {
  robot_server.bind(protocol.port_robo_recv);
}

function send_robot_packet() {
  message = protocol.get_robot_packet();
  server.send(message, protocol.port_robo_send, protocol.robot_address, (err) => {
    stop_robot_timer(err);
  });
}

function start_robot_timer() {
  bind_robot_server();
  robotTimer = setInterval(send_robot_packet(), protocol.robot_precision);
}

function stop_robot_timer(err) {
  robot_server.close();
  clearInterval(robotTimer);
  protocol.robot_server_stopped(err);
}

function configure_robot_server() {
  robot_server.on('message', (msg, rinfo) => {
    protocol.read_robot_packet(msg, rinfo)
  });

  robot_server.on('listening', () => {
    protocol.robot_server_started();
  });

  robot_server.on('error', (err) => {
    stop_robot_timer(err);
    console.log(`Server error: \n${err.stack}`);
  })

}

/**
 * All Services
 */

function configure_servers() {
  configure_robot_server();
}


function start_timers() {
  start_robot_timer();
}

function stop_timers() {
  stop_robot_timer();
}


function DS_start(init_protocol) {
  protocol = init_protocol;

  configure_servers();
  start_timers();

}

function DS_stop() {
  stop_timers();
}