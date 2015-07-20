    /**
     *      ioBroker esp8266 Adapter
     *      07'2015 marelitHOME
     *      Lets control the esp8266 over ethernet (http://homes-smart.ru/index.php/oborudovanie/bez-provodov-wi-fi/62-besprovodnoj-datchik-na-baze-esp8266-dlya-servisa-narodmon-ru)
     *
     *      Version 0.1
     *
     *      The device has N ports.
     *      To read the state of sensors call: http://esp8266_ip/sensors
     *      esp8266 sending to server (if checked): 
     *                          http://esp8266_ip/objects/?script=espdata&idesp=ESP8266009e63b3&dsw1=11.1&dhtt1=22.2&dhth1=33&light=123&
     *                                             ver=0.1.0 beta&vdd=3263&freemem=18881&gpio0=0&gpio1=0&gpio2=0&gpio3=0&counter=0
     *      $params['light'];    //������ � ������� BH1750
     *      $params['dsw1'];     //������ � ������� ������� DS18B20
     *      $params['dsw2'];     //������ �� ������� ������� DS18B20
     *      $params['bmpt'];     //������ � ������� BMP (�����������)
     *      $params['bmpp'];     //������ � ������� BMP (��������)
     *      $params['dhtt1'];    //������ � ������� ������� DHT (�����������)
     *      $params['dhth1'];    //������ � ������� ������� DHT (���������)
     *      $params['dhtt2'];    //������ �� ������� ������� DHT (�����������)
     *      $params['dhth2'];    //������ �� ������� ������� DHT (���������)
     *      $params['idesp'];    //ID ����������
     *      $params['ver'];      //������ ��������
     *      $params['vdd'];      //���������� �� ������
     *      $params['freemem'];  //����� ��������� ������ ������
     *      $params['counter'];  //�������� �������� �� GPIO1
     *
     *      To set the state of GPIO call:
     *      http://esp8266_ip/gpio?st=1&pin=12 , GPIO 12 set ON (HIGH LEVEL)   
     *      http://esp8266_ip/gpio?st=1&pin=12&flash=1 , GPIO 12 set ON (HIGH LEVEL) and the setting will be saved to EEPROM   
     *      http://esp8266_ip/gpioprint , view status of output GPIO   
     *      http://esp8266_ip/gpioprintinput , view status of input GPIO   
     *
     *      RCswitch commands:
     *      http://esp8266_ip/rcremote?pin=X&cmd=YYYY&per=300&bits=24 , &per=300 default in mks
     *
     *      http://esp8266_ip/command?port=value , Value can be ON OFF, Port is number, like http://esp8266_ip/command?4=ON
     *
     *      The device can report the changes of ports to some web server in form
     *      http://ccu.io:8085/?port=Name&value=V  , where "Name" is the digital port name (DO5, DO6, ...) and V is 0 or 1
     *
     */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

var utils  = require(__dirname + '/lib/utils'); // Get common adapter utils
var http   = require('http');
var server =  null;
var ports  = {};

var adapter = utils.adapter('esp8266');

adapter.on('stateChange', function (id, state) {
    if (id && state && !state.ack) {
        id = id.substring(adapter.namespace.length + 1);
        if (!ports[id]) {
            adapter.log.error("Unknown port ID " + id);
            return;
        }

        adapter.log.info("try to control " + id + " with " + state.val);

        if (state.val === "false" || state.val === false) state.val = 0;
        if (state.val === "true"  || state.val === true)  state.val = 1;

        if (parseFloat(state.val) == state.val) {
            // If number => set position
            state.val = parseFloat(state.val);
            if (state.val < 0) {
                adapter.log.warn(": invalid control value " + state.val + ". Value must be positive");
                state.val = 0;
            }
            if (state.val > 1) {
                adapter.log.warn(": invalid control value " + state.val + ". Value must be from 0 to 1, e.g. 0.55");
                state.val = 1;
            }
            if (ports[id].digital && state.val !== 0 && state.val != 1) {
                adapter.log.warn(": invalid control value " + state.val + ". Value for switch must be 0/false or 1/true");
                state.val = state.val ? 1 : 0;
            }

            if (ports[id].digital) {
        if (id == 'ports.port0') {
            id = 0;
        } else
        if (id == 'ports.port1') {
            id = 1;
        } else
        if (id == 'ports.port2') {
            id = 2;
        } else
        if (id == 'ports.port3') {
            id = 3;
        } else
        if (id == 'ports.port4') {
            id = 4;
        } else
        if (id == 'ports.port5') {
            id = 5;
        } else
        if (id == 'ports.port6') {
            id = 6;
        } else
        if (id == 'ports.port7') {
            id = 7;
        } else
        if (id == 'ports.port8') {
            id = 8;
        } else
        if (id == 'ports.port9') {
            id = 9;
        } else
        if (id == 'ports.port10') {
            id = 10;
        } else
        if (id == 'ports.port11') {
            id = 11;
        } else
        if (id == 'ports.port12') {
            id = 12;
        } else
        if (id == 'ports.port13') {
            id = 13;
        } else
        if (id == 'ports.port14') {
            id = 14;
        } else
        if (id == 'ports.port15') {
            id = 15;
        }
//                sendCommand(ports[id].index, state.val);
                sendCommand(id, state.val);
            } else {
                state.val = (state.val - ports[id].offset) / ports[id].factor * 256;
                state.val = Math.round(state.val);
                if (ports[id].isRollo) {
                    sendCommand(ports[id].index, (256 - state.val));
                } else {
                    sendCommand(ports[id].index, state.val);
                }
            }
        }
    }
});

adapter.on('ready', function (obj) {
    main();
});

adapter.on('message', function (obj) {
    if (obj && obj.command) {
        switch (obj.command) {
            case 'send':
                processMessage(obj.message);
                break;

            case 'discover':
                discoverMega(obj);
                break;

            case 'detectPorts':
                detectPorts(obj);
                break;

            default:
                adapter.log.warn('Unknown message: ' + JSON.stringify(obj));
                break;
        }
    }
    processMessages();
});

function processMessages(ignore) {
    adapter.getMessage(function (err, obj) {
        if (obj) {
            if (!ignore && obj && obj.command == 'send') processMessage(obj.message);
            processMessages();
        }
    });
}

// Because the only one port is occupied by first instance, the changes to other devices will be send with messages
function processMessage(message) {
    var port = parseInt(message, 10);

    // Command from instance with web server
    if (adapter.config.ports[port]) {
        // If digital port
        if (adapter.config.ports[port].digital) {
            adapter.config.ports[port].value = true;
            triggerShortPress(port);
        } else {
            adapter.log.debug("reported new value for port " + port + ", request actual value");
            // Get value from analog port
            getPortState(port, processPortState);
        }
    }
}

// Message is IP address
function detectPorts(obj) {
    var ip;
    var password;
    if (typeof obj.message == 'object') {
        ip       = obj.message.ip;
        password = obj.message.password;
    } else {
        ip       = obj.message;
        password = adapter.config.password;
    }
    if (ip && ip != '0.0.0.0') {
        getPortsState(ip, password, function (err, response) {
            var parts  = response.split(';');
            var result = [];
            for (var port = 0; port < parts.length; port++) {
                var type = 0;
                var mode = 0;
                var def  = 0;

                if (parts[port].indexOf('ON/') != -1 || parts[port].indexOf('OFF/') != -1) {
                    type = 'out';
                    mode = 'digital';
                    def  = parts[port].split('/')[1];
                } else
                if (parts[port].indexOf('ON') != -1 || parts[port].indexOf('OFF') != -1) {
                    type = 'in';
                    mode = 'digital';
                } else
                if (parts[port].indexOf('temp')) {
                    type = 'sensor';
                    mode = 'default';
                } else
                if (parts[port].indexOf('hum')) {
                    type = 'sensor';
                    mode = 'dht';
                } else
                if (parts[port].indexOf('/')) {
                    type = 'out';
                    mode = 'analog';
                    def  = parts[port].split('/')[1];
                } else {
                    type = 'in';
                    mode = 'analog';
                }

                result.push({
                    name: 'port' + port,
                    type: type,
                    mode: mode,
                    def:  def
                });
            }
            if (obj.callback) adapter.sendTo(obj.from, obj.command, {error: err, response: result}, obj.callback);
        });
    } else {
        if (obj.callback) adapter.sendTo(obj.from, obj.command, {error: 'invalid address'}, obj.callback);
    }
}

// Get State of ONE port
function getPortState(port, callback) {
    var parts = adapter.config.ip.split(':');

    var options = {
        host: parts[0],
        port: parts[1] || 80,
        path: '/' + adapter.config.password + '/?pt=' + port + '&cmd=get'
    };
    adapter.log.debug("getPortState http://" + options.host + options.path);

    http.get(options, function (res) {
        var xmldata = '';
        res.on('error', function (e) {
            adapter.log.warn("esp8266: " + e);
        });
        res.on('data', function (chunk) {
            xmldata += chunk;
        });
        res.on('end', function () {
            adapter.log.debug("response for " + adapter.config.ip + "[" + port + ']: ' + xmldata);
            // Analyse answer and updates staties
            if (callback) {
                callback(port, xmldata);
            }
        });
    }).on('error', function (e) {
        adapter.log.warn("Got error by request " + e.message);
        if (typeof simulate !== "undefined") {
            callback(port, simulate[port]);
        }
    });
}

// Get state of ALL ports
function getPortsState(ip, password, callback) {
    if (typeof ip == 'function') {
        callback = ip;
        ip = null;
    }
    if (typeof password == 'function') {
        callback = password;
        password = null;
    }
    password = (password === undefined || password === null) ? adapter.config.password : password;
    ip       =  ip || adapter.config.ip;

    var parts = ip.split(':');

    var options = {
        host: parts[0],
        port: parts[1] || 80,
        path: '/' + password + '/?cmd=all'
    };

    adapter.log.debug('getPortState http://' + options.host + options.path);

    http.get(options, function (res) {
        var xmldata = '';
        res.on('error', function (e) {
            adapter.log.warn(e);
        });
        res.on('data', function (chunk) {
            xmldata += chunk;
        });
        res.on('end', function () {
            adapter.log.debug('Response for ' + ip + '[all]: ' + xmldata);
            // Analyse answer and updates statuses
            if (callback) callback(null, xmldata);
        });
    }).on('error', function (e) {
        adapter.log.warn('Got error by request to ' + ip + ': ' + e.message);
        if (typeof simulate !== 'undefined') {
            callback('simulation', simulate.join(';'));
        } else {
            callback(e.message);
        }
    });
}

function triggerLongPress(_port) {
    var _ports = adapter.config.ports;
	
	if (!_ports[_port]) {
		// No confiuration found
		adapter.log.warn('Unknown port: ' + _port);
		return;
	}	
	
    if (_ports[_port].long) {
        _ports[_port].longTimer = null;
        _ports[_port].longDone = true;
        adapter.log.debug('Generate LONG press on port ' + _port)
        adapter.setState(_ports[_port].id + '_long', true, true);
        // Set to false in 200 ms
        setTimeout(function () {
            adapter.setState(_ports[_port].id + '_long', false, true);
        }, 200);
    }
}

function triggerShortPress(_port) {
    var _ports = adapter.config.ports;

	if (!_ports[_port]) {
		// No confiuration found
		adapter.log.warn('Unknown port: ' + _port);
		return;
	}	
	
    if (_ports[_port].digital && _ports[_port].double) {
        if (_ports[_port].doubleTimer) {
            clearTimeout(_ports[_port].doubleTimer);
            _ports[_port].doubleTimer = null;
            adapter.log.debug('Generate double click on port ' + _port);
            // Generate double click
            adapter.setState(_ports[_port].id + '_double', true, true);
            // Set automatically the state of the port to false after 100ms
            setTimeout(function () {
                adapter.setState(_ports[_port].id + '_double', false, true);
            }, 100);
        } else {
            adapter.log.debug("Start timer for " + _ports[_port].double + "ms to detect double click on " + _port);
            _ports[_port].doubleTimer = setTimeout(function () {
                adapter.log.debug('Generate short click on port ' + _port);
                // Generate single click
                _ports[_port].doubleTimer = null;
                adapter.setState(_ports[_port].id, true, true);
                // Set automatically the state of the port to false after 100ms
                setTimeout(function () {
                    adapter.setState(_ports[_port].id, false, true);
                }, 100);
            }, _ports[_port].double);
        }
    } else {
        if (!_ports[_port].switch) {
            _ports[_port].value = true;
            adapter.log.debug("reported new state for port " + _port + " - " + _ports[_port].value);
            adapter.setState(_ports[_port].id, true, true);

            // Set automatically the state of the port to false after 100ms
            setTimeout(function () {
                _ports[_port].value = false;
                adapter.setState(_ports[_port].id, false, true);
            }, 100);
        } else {
            if (_ports[_port].value) {
                adapter.setState(_ports[_port].id, true, true);
            }
        }
    }
}

function processPortState(_port, value) {
    var _ports = adapter.config.ports;

	if (!_ports[_port]) {
		// No confiuration found
		adapter.log.warn('Unknown port: ' + _port);
		return;
	}
	
    if (value !== null) {
        var rawValue = value;
        // Value can be OFF/5 or 27/0 or 27 or ON
        if (typeof value == 'string') {
            var t = value.split('/');
            var m = value.match(/temp:([0-9.]+)/);
            if (m) {
                var hm = value.match(/hum:([0-9.]+)/);
                if (hm) {
                    adapter.log.debug('humidity: ' + hm[1] + '%, ignored');
                }
                value = m[1];
            } else {
                value = t[0];
            }

            rawValue = value;
            t = null;
            if (value == 'OFF') {
                value = 0;
            } else
            if (value == 'ON') {
                value = 1;
            }
            value = parseFloat(value);
        }

        // If status changed
        if (value !== _ports[_port].value) {
            var oldValue = _ports[_port].value;
            _ports[_port].value = value;

            if (_ports[_port].digital) {
                // If press_long
                if (_ports[_port].long) {
                    // Detect EDGE
                    if (oldValue != value) {
                        adapter.log.debug('new state detected on port [' + _port + ']: ' + value);
                        // If pressed
                        if (value) {
                            // If no timer running
                            if (!_ports[_port].longTimer) {
                                adapter.log.debug('start long click detection on [' + _port + ']: ' + value);
                                // Try to detect long click
                                _ports[_port].longTimer = setTimeout(triggerLongPress, adapter.config.longPress, _port);
                            } else {
                                adapter.log.warn('long timer runs, but state change happens on [' + _port + ']: ' + value);
                            }
                        } else {
                            // If released
                            // If timer for double running => stop it
                            if (_ports[_port].longTimer) {
                                adapter.log.debug('stop long click detection on [' + _port + ']: ' + value);
                                clearTimeout(_ports[_port].longTimer);
                                _ports[_port].longTimer = null;
                            }

                            // If long click generated => clear flag and do nothing, elsewise generate normal click
                            if (!_ports[_port].longDone) {
                                adapter.log.debug('detected short click on port [' + _port + ']: ' + value);
                                adapter.setState(_ports[_port].id, !!value, true);
                            } else {
                                adapter.log.debug('clear the double click flag on port [' + _port + ']: ' + value);
                                _ports[_port].longDone = false;
                            }
                        }
                    } else {
                        adapter.log.debug('ignore state on port [' + _port + ']: ' + value + ' (because the same)');
                    }
                } else {
                    adapter.log.debug('detected new state on port [' + _port + ']: ' + value);
                    if (value) {
                        triggerShortPress(_port);
                    } else {
                        adapter.setState(_ports[_port].id, !!value, true);
                    }
                }
            } else if (_ports[_port].isRollo) {
                adapter.log.debug('detected new rollo state on port [' + _port + ']: ' + value + ', calc state ' + ((256 - value) / 256));
                adapter.setState(_ports[_port].id, ((256 - _ports[_port].value) / 256).toFixed(2), true);
            } else {
                adapter.log.debug('detected new value on port [' + _port + ']: ' + value + ', calc state ' + (value / 256));
                var f = (value / 256) * _ports[_port].factor + _ports[_port].offset;
                adapter.setState(_ports[_port].id, f.toFixed(4), true);
            }
        }
    }
}

function pollStatus(dev) {
    /*for (var port = 0; port < adapter.config.ports.length; port++) {
        getPortState(port, processPortState);
    }*/
    getPortsState(function (err, data) {
        if (err) adapter.log.warn(err);

        if (data) {
            var ports = data.split(';');
            for (var p = 0; p < ports.length; p++) {
                processPortState(p, ports[p]);
            }
        }
    });
}

// Process http://ioBroker:80/instance/?pt=6
function restApi(req, res) {
    var values = {};
    var url    = req.url;
    var pos    = url.indexOf('?');

    if (pos != -1) {
        var arr = url.substring(pos + 1).split('&');
        url = url.substring(0, pos);

        for (var i = 0; i < arr.length; i++) {
            arr[i] = arr[i].split('=');
            values[arr[i][0]] = (arr[i][1] === undefined) ? null : arr[i][1];
        }
        if (values.prettyPrint !== undefined) {
            if (values.prettyPrint === 'false') values.prettyPrint = false;
            if (values.prettyPrint === null)    values.prettyPrint = true;
        }
        // Default value for wait
        if (values.wait === null) values.wait = 2000;
    }

    var parts  = url.split('/');
    var device = parts[1];

    if (!device || (device != adapter.instance && (!adapter.config.name || device != adapter.config.name))) {
        if (device && values.pt !== undefined) {
            // Try to find name of the instance
            if (parseInt(device, 10) == device) {
                adapter.sendTo('esp8266.' + device, 'send', values.pt);
                res.writeHead(0);
                res.end('OK->');
            } else {
                // read all instances of esp8266
                adapter.getForeignObjects('system.adapter.esp8266.*', 'instance', function (err, arr) {
                    if (arr) {
                        for (var id in arr) {
                            if (arr[id].native.name == device) {
                                adapter.sendTo(id, 'send', values.pt);
                                res.writeHead(0);
                                res.end('OK->');
                                return;
                            }
                        }
                    }

                    res.writeHead(500);
                    res.end('Cannot find ' + device);
                });
            }
        } else {
            res.writeHead(500);
            res.end('Error: unknown device name "' + device + '"');
        }
        return;
    }
    
    if (values.pt !== undefined) {
        var _port = parts[1];
        if (adapter.config.ports[_port]) {
            // If digital port
            if (adapter.config.ports[_port].digital && !adapter.config.ports[_port].switch) {
                triggerShortPress(_port);
            } else {
                adapter.log.debug("reported new value for port " + _port + ", request actual value");
                // Get value from analog port
                getPortState(_port, processPortState);
            }
            res.writeHead(0);
            res.end('OK');
            return;
        }
    }
    res.writeHead(500);
    res.end('Error: invalid input "' + req.url + '". Expected /' + (adapter.config.name || adapter.instance) + '/?pt=X');
}

function sendCommand(port, value) {
    var data = 'cmd=' + port + ':' + value;

    var parts = adapter.config.ip.split(':');

    var options = {
        host: parts[0],
        port: parts[1] || 80,
        path: '/' + adapter.config.password + '/?' + data
    };
    adapter.log.debug('Send command "' + data + '" to ' + adapter.config.ip);

    // Set up the request
    http.get(options, function (res) {
        var xmldata = '';
        res.setEncoding('utf8');
        res.on('error', function (e) {
            adapter.log.warn(e.toString());
        });
        res.on('data', function (chunk) {
            xmldata += chunk;
        });
        res.on('end', function () {
            adapter.log.debug('Response "' + xmldata + '"');
            if (adapter.config.ports[port]) {
                // Set state only if positive response from esp8266
                if (adapter.config.ports[port].digital) {
                    adapter.setState(adapter.config.ports[port].id, value ? true : false, true);
                } else if (adapter.config.ports[port].isRollo) {
                    adapter.setState(adapter.config.ports[port].id, ((255 - value) / 255).toFixed(2), true);
                } else {
                    var f = (value / 256) * adapter.config.ports[port].factor + adapter.config.ports[port].offset;
                    adapter.setState(adapter.config.ports[port].id, f.toFixed(4), true);
                }
            } else {
                adapter.log.warn('Unknown port ' + port);
            }
        });
    }).on('error', function (e) {
        adapter.log.warn("Got error by post request " + e.toString());
    });
}

function createState(port, callback) {
    var id = port.name.replace(/[.\s]+/g, '_');
    if (port.room) adapter.addStateToEnum('room', port.room, '', 'ports', id);

    var native = JSON.parse(JSON.stringify(port));

    if (native.name !== undefined) delete native.name;
    if (native.room !== undefined) delete native.room;

    var common = {
        name:   port.name,
        def:    false,
        role:   'indicator',
        type:   port.digital ? 'boolean' : 'number',
        read:   'true',
        write:  (port.input || false).toString(),
        desc:   port.digital ? 'Short press on port ' + port.name : 'Analog value on port' + port.name
    };

    var task = 1;
    adapter.createState('', 'ports', id, common, native, function () {
        task--;
        if (!task && callback) callback({_id: id, common: common, native: native});
    });

    if (port.digital && port.long) {
        var c = JSON.parse(JSON.stringify(common));
        c.name = port.name + ' long';
        c.desc = 'Long press on port ' + port.name;
        task++;
        adapter.createState('', 'ports', id + '_long', c, native, function () {
            task--;
            if (!task && callback) callback({_id: id, common: common, native: native});
        });
    } else {
        adapter.deleteState('', 'ports', id + '_long');
    }
    if (port.digital && port.double) {
        var d = JSON.parse(JSON.stringify(common));
        d.name = port.name + ' double';
        d.desc = 'Dobule click on port ' + port.name;
        task++;
        adapter.createState('', 'ports', id + '_double', d, native, function () {
            task--;
            if (!task && callback) callback({_id: id, common: common, native: native});
        });
    } else {
        adapter.deleteState('', 'ports', id + '_double');
    }
}

function addState(port, callback) {
    adapter.getObject('ports', function (err, obj) {
        if (err || !obj) {
            // if root does not exist, channel will not be created
            adapter.createChannel('', 'ports', [], function () {
                createState(port, callback);
            });
        } else {
            createState(port, callback);
        }
    });
}

/*
{
    "name":    "port0",
    "input":   true,
    "switch":  true,
    "offset":  0,
    "factor":  1
    "digital": true
}
*/

function syncObjects() {

    adapter.config.longPress = parseInt(adapter.config.longPress, 10) || 400;

    // read all objects of the device
    adapter.getStatesOf('', 'ports', function (err, _states) {
        var configToDelete = [];
        var configToAdd    = [];
        var k;
        var id;
        if (adapter.config.ports) {
            for (k = 0; k < adapter.config.ports.length; k++) {
                configToAdd.push(adapter.config.ports[k].name);
            }
        }

        if (_states) {
            for (var j = 0; j < _states.length; j++) {
                var pos = configToAdd.indexOf(_states[j].common.name);
                if (pos != -1) {
                    configToAdd.splice(pos, 1);

                    // Check name and room
                    for (var u = 0; u < adapter.config.ports.length; u++) {

                        adapter.config.ports[u].digital = (adapter.config.ports[u].digital === true || adapter.config.ports[u].digital === 'true');
                        adapter.config.ports[u].switch  = (adapter.config.ports[u].switch  === true || adapter.config.ports[u].switch  === 'true');
                        adapter.config.ports[u].input   = (adapter.config.ports[u].input   === true || adapter.config.ports[u].input   === 'true');
                        adapter.config.ports[u].double  = parseInt(adapter.config.ports[u].double, 10);
                        adapter.config.ports[u].long    = (adapter.config.ports[u].long   === true || adapter.config.ports[u].long   === 'true');

                        // Check if settings are valid
                        if (adapter.config.ports[u].digital && adapter.config.ports[u].long && !adapter.config.ports[u].switch) {
                            adapter.log.warn('To enable long press detection on port ' + adapter.config.ports[u].name + ' set port type to "switch"!');
                            adapter.config.ports[u].long = false;
                        }
                        if (adapter.config.ports[u].digital && adapter.config.ports[u].long && !adapter.config.longPress) {
                            adapter.log.warn('To enable long press detection on port ' + adapter.config.ports[u].name + ' set longPress interval to non zero!');
                            adapter.config.ports[u].long = false;
                        }

                        if (adapter.config.ports[u].name == _states[j].common.name) {
                            var n1 = JSON.parse(JSON.stringify(_states[j].native));
                            var n2 = JSON.parse(JSON.stringify(adapter.config.ports[u]));

                            if (n1.long != n2.long || n1.double != n2.double) {
                                addState(JSON.parse(JSON.stringify(adapter.config.ports[u])));
                                adapter.extendObject(_states[j]._id, {native: n2});
                            } else {
                                if (n2.name !== undefined) delete n2.name;
                                if (n2.room !== undefined) delete n2.room;
                                n2.index = u;
                                n2 = JSON.stringify(n2);

                                if (JSON.stringify(n1) != n2) {
                                    n2 = JSON.parse(n2);
                                    adapter.extendObject(_states[j]._id, {native: n2});
                                }
                            }

                            if (adapter.config.ports[u].room) {
                                adapter.addStateToEnum('room', adapter.config.ports[u].room, '', 'ports', _states[j]._id);
                            } else {
                                adapter.deleteStateFromEnum('room', '', 'ports', _states[j]._id);
                            }
                        }
                    }
                } else {
                    configToDelete.push(_states[j]._id);
                }
            }
        }

        if (configToAdd.length) {
            for (var r = 0; r < adapter.config.ports.length; r++) {
                if (configToAdd.indexOf(adapter.config.ports[r].name) != -1) {
                    addState(JSON.parse(JSON.stringify(adapter.config.ports[r])));
                }
            }
        }
        if (configToDelete.length) {
            for (var e = 0; e < configToDelete.length; e++) {
                adapter.deleteStateFromEnum('room', '', 'ports', configToDelete[e]);
                adapter.deleteState('', 'ports', configToDelete[e]);
            }
        }

        if (adapter.config.ports) {
            for (k = 0; k < adapter.config.ports.length; k++) {
                adapter.config.ports[k].id      = 'ports.' + adapter.config.ports[k].name.replace(/[.\s]+/g, '_');
                adapter.config.ports[k].digital = (adapter.config.ports[k].digital === true || adapter.config.ports[k].digital === 'true');
                adapter.config.ports[k].switch  = (adapter.config.ports[k].switch  === true || adapter.config.ports[k].switch  === 'true');
                adapter.config.ports[k].input   = (adapter.config.ports[k].input   === true || adapter.config.ports[k].input   === 'true');
                adapter.config.ports[k].factor  = parseFloat(adapter.config.ports[k].factor);
                adapter.config.ports[k].offset  = parseFloat(adapter.config.ports[k].offset);
                adapter.config.ports[k].double  = parseInt(adapter.config.ports[k].double, 10);
                adapter.config.ports[k].long    = (adapter.config.ports[k].long   === true || adapter.config.ports[k].long   === 'true');

                if (!adapter.config.ports[k].factor) {
                    adapter.config.ports[k].factor = 1;
                    adapter.log.error('Invalid factor 0 for port ' + k + '/"' + adapter.config.ports[k].name + '". Set factor to 1');
                }
                ports[adapter.config.ports[k].id] = adapter.config.ports[k];
            }
        }

        if (adapter.config.ip && adapter.config.ip != '0.0.0.0') {
            pollStatus();
            setInterval(pollStatus, adapter.config.pollInterval * 1000);
        }
    });
}

//settings: {
//    "port":   8080,
//    "auth":   false,
//    "secure": false,
//    "bind":   "0.0.0.0", // "::"
//    "cache":  false
//}
function main() {
    if (adapter.config.port) {
        server = require('http').createServer(restApi);

        adapter.getPort(adapter.config.port, function (port) {
            if (port != adapter.config.port && !adapter.config.findNextPort) {
                adapter.log.warn('port ' + adapter.config.port + ' already in use');
            } else {
                server.listen(port);
                adapter.log.info('http server listening on port ' + port);
            }
        });
    } else {
        adapter.log.info('No port specified');
    }
    syncObjects();
    adapter.subscribeStates('*');
    processMessages(true);
}



