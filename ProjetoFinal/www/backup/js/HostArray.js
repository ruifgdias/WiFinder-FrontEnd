var HostArray = function (local, arrayHosts) {
    this.local = "#" + local;
    this.arrayHosts = arrayHosts;
    this.arrayElements = [];
};


HostArray.prototype.listaHost = function () {
    $("body").find(this.local).html("");
    var self = this;
    for (var i = 0; i < this.arrayHosts.length; i++) {
        this.arrayElements.push(
                new Host(
                        self.local,
                        self.arrayHosts[i].nomeAntena,
                        self.arrayHosts[i].latitude,
                        self.arrayHosts[i].longitude).createAndAddToDivHost());
    }
    if (this.arrayHosts.length == 0) {
        $("body").find(this.local).append("<div class='jumbotron'><h2>N&atilde;o existem antenas ativas de momento</h2></div>");
    }
};

HostArray.prototype.listaAp = function () {
    $("body").find(this.local).html("");
    var self = this;
    for (var i = 0; i < this.arrayHosts.length; i++) {
        this.arrayElements.push(
                new Ap(
                        self.local,
                        self.arrayHosts[i].Authentication,
                        self.arrayHosts[i].Cipher,
                        self.arrayHosts[i].ESSID,
                        self.arrayHosts[i].Power,
                        self.arrayHosts[i].Privacy,
                        self.arrayHosts[i].macAddress,
                        self.arrayHosts[i].nameVendor).createAndAddToDivAp());
    }
    if (this.arrayHosts.length == 0) {
        $("body").find(this.local).append("<div class='jumbotron'><h2>N&atilde;o existem antenas ativas de momento</h2></div>");
    }
};

HostArray.prototype.listaDisp = function () {
    $("body").find(this.local).html("");
    var self = this;
    for (var i = 0; i < this.arrayHosts.length; i++) {
        this.arrayElements.push(
                new Disp(
                        self.local,
                        self.arrayHosts[i].BSSID,
                        self.arrayHosts[i].Power,
                        self.arrayHosts[i].Probed_ESSIDs,
                        self.arrayHosts[i].macAddress,
                        self.arrayHosts[i].nameVendor).createAndAddToDivDisp());
    }
    if (this.arrayHosts.length == 0) {
        $("body").find(this.local).append("<div class='jumbotron'><h2>N&atilde;o existem antenas ativas de momento</h2></div>");
    }
};