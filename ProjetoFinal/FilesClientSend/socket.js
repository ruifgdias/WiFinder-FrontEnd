/* global process, module, assert, result */

var url = "http://web.stanford.edu/dept/its/projects/desktop/snsr/nmap-mac-prefixes.txt";
var net = require('net');
var connection = null;
var server;
var dbConfig = {
    host: '185.15.22.55',
    port: 28015,
    db: 'ProjetoFinal',
    tables: {
        'DispMoveis': 'macAddress',
        'DispAp': 'macAddress',
        "AntDisp": "nomeAntena",
        "AntAp": "nomeAntena",
        "ActiveAnt": "nomeAntena",
        "tblPrefix": "prefix"
    }
};
var r = require('rethinkdb');

var ServerSocket = function (port) {
    this.port = port;
    this.net = require('net');
    this.serverSck = net.createServer(this.net);
    this.clienteSend = "default";
    this.lati = "";
    this.long = "";
    r.connect({
        host: dbConfig.host,
        port: dbConfig.port}, function (err, conn) {
        if (err) {
            throw err;
        }
        connection = conn;
        console.log("Connected to ReThinkdb DataBase.");
    });

    r.connect({host: dbConfig.host, port: dbConfig.port}, function (err, connection) {
        r.dbCreate(dbConfig.db).run(connection, function (err, result) {
            if (err) {
                console.log(JSON.stringify(err));
            }
            for (var tbl in dbConfig.tables) {
                (function (tableName) {
                    r.db(dbConfig.db).tableCreate(tableName, {primaryKey: dbConfig.tables[tbl]}).run(connection, function (err, result) {
                        if (err) {
                            console.log(JSON.stringify(err));
                        }
                    });
                })(tbl);
            }
            r.db(dbConfig.db).table("tblPrefix").coerceTo("array").count().run(connection, function (err, resul) {
                if (err) {
                    console.log(err);
                }
//            console.log(resul);
                if (!(resul > 0) || typeof resul == "undefined") {
                    download(url, function (data) {
                        if (data) {
                            var lines = data.split("\n");
                            for (var i in lines) {
                                var line = lines[i].trim();
                                if (line[0] != "#" && line.length > 5) {
                                    var prefix = line.substring(0, 6);
                                    var vendor = line.substring(7, line.length);
                                    var keyPrefix = prefix.substr(0, 2) + ":" + prefix.substr(2, 2) + ":" + prefix.substr(4);
                                    r.db(dbConfig.db).table("tblPrefix").get(keyPrefix).replace(function (row) {
                                        return r.branch(
                                                row.eq(null),
                                                {
                                                    "prefix": keyPrefix,
                                                    "vendor": vendor
                                                }, row)
                                    }).run(connection, function (err, resul) {
                                        if (err) {
                                            console.log(err);
                                        }
//                            console.log(resul);
                                    });
                                }
                            }
                        } else {
                            console.log("error");
                        }
                    });
                }
                server.start();
            });
        });
    });
};

ServerSocket.prototype.start = function () {
    console.log("start");
    this.serverSck.listen(this.port);

    this.serverSck.on('connection', function (sock) {

        // We have a connection - a socket object is assigned to the connection automatically
        console.log('CONNECTED: IP - ' + sock.remoteAddress + ' Port - ' + sock.remotePort);

        // Add a 'data' event handler to this instance of socket
        sock.on('data', function (data) {
            var client = this.clienteSend;
            var latitude = this.lati;
            var longitude = this.long;
            var aux = data.toString();
            var resultLine = aux.split("\r\n");
            for (var i in resultLine) {
                var line = resultLine[i];
                if (line[2] == ":" && line.length > 4) {
                    var result = line.split(", ");
                    if (result.length < 8) {
                        var valsHost = result;
                        var valuesHst = result;
                        r.db(dbConfig.db).table("DispMoveis").get(valsHost[0]).replace(function (row) {
                            return r.branch(
                                    row.eq(null),
                                    {
                                        "macAddress": valsHost[0],
                                        "nameVendor": r.db(dbConfig.db).table("tblPrefix").get(valsHost[0].substring(0, 8)).getField("vendor").default(""),
                                        "disp": [{
                                                name: client,
                                                "values": [{
                                                        "First_time": r.now().inTimezone("+01:00"), //(typeof valsHost[1] == "undefined") ? "" : valsHost[1],
                                                        "Last_time": r.now().inTimezone("+01:00"), //(typeof valsHost[2] == "undefined") ? "" : valsHost[2],
                                                        "Power": (typeof valsHost[3] == "undefined") ? "" : valsHost[3],
                                                        "packets": (typeof valsHost[4] == "undefined") ? "" : valsHost[4],
                                                        "BSSID": (typeof valsHost[5] == "undefined") ? "" : valsHost[5],
                                                        "Probed_ESSIDs": (typeof valsHost[6] == "undefined") ? "" : valsHost[6]
                                                    }]
                                            }]
                                    },
                            r.branch(
                                    row("disp")("name").contains(client),
                                    row.merge({
                                        "disp": row('disp').map(function (d) {
                                            return r.branch(
                                                    d('name').eq(client).default(false),
                                                    d.merge({values: d('values').append({
                                                            "First_time": r.db(dbConfig.db).table("DispMoveis").get(valsHost[0]).do(function (row) {
                                                                return  row("disp")("values").nth(0).getField("First_time")
                                                            }).limit(1).nth(0),
                                                            "Last_time": r.now().inTimezone("+01:00"),
                                                            "Power": (typeof valsHost[3] == "undefined") ? "" : valsHost[3],
                                                            "packets": (typeof valsHost[4] == "undefined") ? "" : valsHost[4],
                                                            "BSSID": (typeof valsHost[5] == "undefined") ? "" : valsHost[5],
                                                            "Probed_ESSIDs": (typeof valsHost[6] == "undefined") ? "" : valsHost[6]
                                                        })}),
                                                    d);
                                        })}),
                                    {
                                        "macAddress": valsHost[0],
                                        "nameVendor": r.db(dbConfig.db).table("tblPrefix").get(valsHost[0].substring(0, 8)).getField("vendor").default(""),
                                        "disp": row("disp").append({
                                            "name": client,
                                            "values": [{
                                                    "First_time": r.now().inTimezone("+01:00"), //(typeof valsHost[1] == "undefined") ? "" : valsHost[1],
                                                    "Last_time": r.now().inTimezone("+01:00"), //(typeof valsHost[2] == "undefined") ? "" : valsHost[2],
                                                    "Power": (typeof valsHost[3] == "undefined") ? "" : valsHost[3],
                                                    "packets": (typeof valsHost[4] == "undefined") ? "" : valsHost[4],
                                                    "BSSID": (typeof valsHost[5] == "undefined") ? "" : valsHost[5],
                                                    "Probed_ESSIDs": (typeof valsHost[6] == "undefined") ? "" : valsHost[6]
                                                }]
                                        })
                                    }))
                        }, {nonAtomic: true}).run(connection, function (err, res) {
                            if (err) {
                                console.log(JSON.stringify(err));
                            }

//                            console.log(client);
//                            console.log(res);
                        });

                        r.db(dbConfig.db).table("AntDisp").get(client).replace(function (row) {
                            return r.branch(
                                    row.eq(null),
                                    {
                                        "nomeAntena": client,
                                        "host": [{
                                                "macAddress": valuesHst[0],
                                                "data": r.now().inTimezone("+01:00"),
                                                "Power": (typeof valsHost[3] == "undefined") ? "" : valsHost[3],
                                                "nameVendor": r.db(dbConfig.db).table("tblPrefix").get(valsHost[0].substring(0, 8)).getField("vendor").default("")
                                            }]
                                    },
                            r.branch(
                                    row("host")("macAddress").contains(valuesHst[0]),
                                    row.merge({
                                        "host": row("host").map(function (d) {
                                            return r.branch(
                                                    d("macAddress").eq(valuesHst[0]).default(false),
                                                    {
                                                        "macAddress": valuesHst[0],
                                                        "data": r.now().inTimezone("+01:00"),
                                                        "Power": (typeof valsHost[3] == "undefined") ? "" : valsHost[3],
                                                        "nameVendor": r.db(dbConfig.db).table("tblPrefix").get(valsHost[0].substring(0, 8)).getField("vendor").default("")
                                                    }, d)
                                        })
                                    }),
                                    {
                                        "nomeAntena": client,
                                        "host": row("host").append({
                                            "macAddress": valuesHst[0],
                                            "data": r.now().inTimezone("+01:00"),
                                            "Power": (typeof valsHost[3] == "undefined") ? "" : valsHost[3],
                                            "nameVendor": r.db(dbConfig.db).table("tblPrefix").get(valsHost[0].substring(0, 8)).getField("vendor").default("")
                                        })

                                    }))
                        }, {nonAtomic: true}).run(connection, function (err, resul) {
                            if (err) {
                                console.log(err);
                            }
//                            console.log(resul);
                        });

                    } else {
                        var valsAp = result;
                        var valuesAp = result;
                        r.db(dbConfig.db).table("DispAp").get(valsAp[0]).replace(function (row) {
                            return r.branch(
                                    row.eq(null),
                                    {
                                        "macAddress": valsAp[0],
                                        "nameVendor": r.db(dbConfig.db).table("tblPrefix").get(valsAp[0].substring(0, 8)).getField("vendor").default(""),
                                        "disp": [{
                                                name: client,
                                                "values": [{
                                                        "First_time": r.now().inTimezone("+01:00"),
                                                        "Last_time": r.now().inTimezone("+01:00"),
                                                        "channel": (typeof valsAp[3] == "undefined") ? "" : valsAp[3],
                                                        "Speed": (typeof valsAp[4] == "undefined") ? "" : valsAp[4],
                                                        "Privacy": (typeof valsAp[5] == "undefined") ? "" : valsAp[5],
                                                        "Cipher": (valsAp.length == 14) ? ((typeof valsAp[6] == "undefined") ? "" : (typeof valsAp[6].split(",")[0] == "undefined") ? "" : valsAp[6].split(",")[0]) : valsAp[6],
                                                        "Authentication": (valsAp.length == 14) ? ((typeof valsAp[6] == "undefined") ? "" : (typeof valsAp[6].split(",")[1] == "undefined") ? "" : valsAp[6].split(",")[1]) : valsAp[7],
                                                        "Power": (valsAp.length == 14) ? ((typeof valsAp[7] == "undefined") ? "" : valsAp[7]) : ((typeof valsAp[8] == "undefined") ? "" : valsAp[8]),
                                                        "beacons": (valsAp.length == 14) ? ((typeof valsAp[8] == "undefined") ? "" : valsAp[8]) : ((typeof valsAp[9] == "undefined") ? "" : valsAp[9]),
                                                        "IV": (valsAp.length == 14) ? ((typeof valsAp[9] == "undefined") ? "" : valsAp[9]) : ((typeof valsAp[10] == "undefined") ? "" : valsAp[10]),
                                                        "LAN_IP": (valsAp.length == 14) ? ((typeof valsAp[10] == "undefined") ? "" : valsAp[10]) : ((typeof valsAp[11] == "undefined") ? "" : valsAp[11]),
                                                        "ID_length": (valsAp.length == 14) ? ((typeof valsAp[11] == "undefined") ? "" : valsAp[11]) : ((typeof valsAp[12] == "undefined") ? "" : valsAp[12]),
                                                        "ESSID": (valsAp.length == 14) ? ((typeof valsAp[12] == "undefined") ? "" : valsAp[12]) : ((typeof valsAp[13] == "undefined") ? "" : valsAp[13]),
                                                        "key": (valsAp.length == 14) ? ((typeof valsAp[13] == "undefined") ? "" : valsAp[13]) : ((typeof valsAp[14] == "undefined") ? "" : valsAp[14])
                                                    }]
                                            }]
                                    },
                            r.branch(
                                    row("disp")("name").contains(client),
                                    row.merge({
                                        "disp": row('disp').map(function (d) {
                                            return r.branch(d('name').eq(client).default(false), d.merge({values: d("values").append({
                                                    "First_time": r.db(dbConfig.db).table("DispAp").get(valsAp[0]).do(function (row) {
                                                        return  row("disp")("values").nth(0).getField("First_time")
                                                    }).limit(1).nth(0),
                                                    "Last_time": r.now().inTimezone("+01:00"),
                                                    "channel": (typeof valsAp[3] == "undefined") ? "" : valsAp[3],
                                                    "Speed": (typeof valsAp[4] == "undefined") ? "" : valsAp[4],
                                                    "Privacy": (typeof valsAp[5] == "undefined") ? "" : valsAp[5],
                                                    "Cipher": (valsAp.length == 14) ? ((typeof valsAp[6] == "undefined") ? "" : (typeof valsAp[6].split(",")[0] == "undefined") ? "" : valsAp[6].split(",")[0]) : valsAp[6],
                                                    "Authentication": (valsAp.length == 14) ? ((typeof valsAp[6] == "undefined") ? "" : (typeof valsAp[6].split(",")[1] == "undefined") ? "" : valsAp[6].split(",")[1]) : valsAp[7],
                                                    "Power": (valsAp.length == 14) ? ((typeof valsAp[7] == "undefined") ? "" : valsAp[7]) : ((typeof valsAp[8] == "undefined") ? "" : valsAp[8]),
                                                    "beacons": (valsAp.length == 14) ? ((typeof valsAp[8] == "undefined") ? "" : valsAp[8]) : ((typeof valsAp[9] == "undefined") ? "" : valsAp[9]),
                                                    "IV": (valsAp.length == 14) ? ((typeof valsAp[9] == "undefined") ? "" : valsAp[9]) : ((typeof valsAp[10] == "undefined") ? "" : valsAp[10]),
                                                    "LAN_IP": (valsAp.length == 14) ? ((typeof valsAp[10] == "undefined") ? "" : valsAp[10]) : ((typeof valsAp[11] == "undefined") ? "" : valsAp[11]),
                                                    "ID_length": (valsAp.length == 14) ? ((typeof valsAp[11] == "undefined") ? "" : valsAp[11]) : ((typeof valsAp[12] == "undefined") ? "" : valsAp[12]),
                                                    "ESSID": (valsAp.length == 14) ? ((typeof valsAp[12] == "undefined") ? "" : valsAp[12]) : ((typeof valsAp[13] == "undefined") ? "" : valsAp[13]),
                                                    "key": (valsAp.length == 14) ? ((typeof valsAp[13] == "undefined") ? "" : valsAp[13]) : ((typeof valsAp[14] == "undefined") ? "" : valsAp[14])
                                                })}), d);
                                        })}),
                                    {
                                        "macAddress": valsAp[0],
                                        "nameVendor": r.db(dbConfig.db).table("tblPrefix").get(valsAp[0].substring(0, 8)).getField("vendor").default(""),
                                        "disp": row('disp').append({
                                            name: client,
                                            "values": [{
                                                    "First_time": r.now().inTimezone("+01:00"), //(typeof valsAp[1] == "undefined") ? "" : valsAp[1],
                                                    "Last_time": r.now().inTimezone("+01:00"), //(typeof valsAp[2] == "undefined") ? "" : valsAp[2],
                                                    "channel": (typeof valsAp[3] == "undefined") ? "" : valsAp[3],
                                                    "Speed": (typeof valsAp[4] == "undefined") ? "" : valsAp[4],
                                                    "Privacy": (typeof valsAp[5] == "undefined") ? "" : valsAp[5],
                                                    "Cipher": (valsAp.length == 14) ? ((typeof valsAp[6] == "undefined") ? "" : (typeof valsAp[6].split(",")[0] == "undefined") ? "" : valsAp[6].split(",")[0]) : valsAp[6],
                                                    "Authentication": (valsAp.length == 14) ? ((typeof valsAp[6] == "undefined") ? "" : (typeof valsAp[6].split(",")[1] == "undefined") ? "" : valsAp[6].split(",")[1]) : valsAp[7],
                                                    "Power": (valsAp.length == 14) ? ((typeof valsAp[7] == "undefined") ? "" : valsAp[7]) : ((typeof valsAp[8] == "undefined") ? "" : valsAp[8]),
                                                    "beacons": (valsAp.length == 14) ? ((typeof valsAp[8] == "undefined") ? "" : valsAp[8]) : ((typeof valsAp[9] == "undefined") ? "" : valsAp[9]),
                                                    "IV": (valsAp.length == 14) ? ((typeof valsAp[9] == "undefined") ? "" : valsAp[9]) : ((typeof valsAp[10] == "undefined") ? "" : valsAp[10]),
                                                    "LAN_IP": (valsAp.length == 14) ? ((typeof valsAp[10] == "undefined") ? "" : valsAp[10]) : ((typeof valsAp[11] == "undefined") ? "" : valsAp[11]),
                                                    "ID_length": (valsAp.length == 14) ? ((typeof valsAp[11] == "undefined") ? "" : valsAp[11]) : ((typeof valsAp[12] == "undefined") ? "" : valsAp[12]),
                                                    "ESSID": (valsAp.length == 14) ? ((typeof valsAp[12] == "undefined") ? "" : valsAp[12]) : ((typeof valsAp[13] == "undefined") ? "" : valsAp[13]),
                                                    "key": (valsAp.length == 14) ? ((typeof valsAp[13] == "undefined") ? "" : valsAp[13]) : ((typeof valsAp[14] == "undefined") ? "" : valsAp[14])
                                                }]
                                        })
                                    }))
                        }, {nonAtomic: true}).run(connection, function (err, res) {
                            if (err) {
                                console.log(JSON.stringify(err));
                            }
//                            console.log(client);
//                            console.log(res);
                        });

                        r.db(dbConfig.db).table("AntAp").get(client).replace(function (row) {
                            return r.branch(
                                    row.eq(null),
                                    {
                                        "nomeAntena": client,
                                        "host": [{
                                                "macAddress": valuesAp[0],
                                                "data": r.now().inTimezone("+01:00"),
                                                "Power": (valsAp.length == 14) ? ((typeof valsAp[7] == "undefined") ? "" : valsAp[7]) : ((typeof valsAp[8] == "undefined") ? "" : valsAp[8]),
                                                "nameVendor": r.db(dbConfig.db).table("tblPrefix").get(valsAp[0].substring(0, 8)).getField("vendor").default("")
                                            }]
                                    },
                            r.branch(
                                    row("host")("macAddress").contains(valuesAp[0]),
                                    row.merge({
                                        "host": row("host").map(function (d) {
                                            return r.branch(
                                                    d("macAddress").eq(valuesAp[0]).default(false),
                                                    {
                                                        "macAddress": valuesAp[0],
                                                        "data": r.now().inTimezone("+01:00"),
                                                        "Power": (valsAp.length == 14) ? ((typeof valsAp[7] == "undefined") ? "" : valsAp[7]) : ((typeof valsAp[8] == "undefined") ? "" : valsAp[8]),
                                                        "nameVendor": r.db(dbConfig.db).table("tblPrefix").get(valsAp[0].substring(0, 8)).getField("vendor").default("")
                                                    }, d)
                                        })
                                    }),
                                    {
                                        "nomeAntena": client,
                                        "host": row("host").append({
                                            "macAddress": valuesAp[0],
                                            "data": r.now().inTimezone("+01:00"),
                                            "Power": (valsAp.length == 14) ? ((typeof valsAp[7] == "undefined") ? "" : valsAp[7]) : ((typeof valsAp[8] == "undefined") ? "" : valsAp[8]),
                                            "nameVendor": r.db(dbConfig.db).table("tblPrefix").get(valsAp[0].substring(0, 8)).getField("vendor").default("")
                                        })
                                    }));
                        }, {nonAtomic: true}).run(connection, function (err, resul) {
                            if (err) {
                                console.log(err);
                            }
//                            console.log(resul);
                        });
                    }
                } else {
                    if (line[0] == "a" && line[1] == "n" && line[2] == "t") {
                        this.clienteSend = line.replace(/(\r\n|\n|\r)/gm, "");
                        console.log(this.clienteSend);
                    }
                    if (line[0] == "l" && line[1] == "a" && line[2] == "t") {
                        this.lati = line.split("$")[1].replace(/(\r\n|\n|\r)/gm, "");
                        console.log(this.lati);
                    }
                    if (line[0] == "l" && line[1] == "o" && line[2] == "n") {
                        this.long = line.split("$")[1].replace(/(\r\n|\n|\r)/gm, "");
                        console.log(this.long);
                    }
                }
            }
            if (typeof client != "undefined" &&
                    typeof latitude != "undefined" &&
                    typeof longitude != "undefined" &&
                    client != "default") {
                r.db(dbConfig.db).table("ActiveAnt").get(client).replace(function (row) {
                    return r.branch(
                            row.eq(null),
                            {
                                "nomeAntena": client,
                                "latitude": latitude,
                                "longitude": longitude,
                                "data": r.now().inTimezone("+01:00")
                            },
                    {
                        "nomeAntena": client,
                        "latitude": latitude,
                        "longitude": longitude,
                        "data": r.now().inTimezone("+01:00")
                    });
                }).run(connection, function (err, resul) {
                    if (err) {
                        console.log(err);
                    }
//                    console.log(resul);
                });

            }
            console.log('--------------------------------------------------------');
        });
        // Add a 'close' event handler to this instance of socket
        sock.on('disconnect', function (data) {
            console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
        });
    });


    console.log('Server Socket Wait : ' + this.port);
};

server = new ServerSocket(8888);

//excepcoes para os erros encontrados
//process.on('uncaughtException', function (err) {
//    console.log('Excepcao capturada: ' + err);
//});
module.exports = ServerSocket;



function download(url, callback) {
    http.get(url, function (res) {
        var data = "";
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on("end", function () {
            callback(data);
        });
    }).on("error", function () {
        callback(null);
    });
}