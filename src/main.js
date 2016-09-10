var AlfredNode = require("alfred-workflow-nodejs");
var actionHandler = AlfredNode.actionHandler;
var workflow = AlfredNode.workflow;
var Item = AlfredNode.Item;
var storage = AlfredNode.storage;
var utils = AlfredNode.utils;
var request = require("request");
var exec = require("child_process").exec;
var htmlparser = require("htmlparser");

workflow.setName("alfred-myinstants");

var BASE_URL = "https://www.myinstants.com";

(function main() {
  // Gets HTML from page
  var getHtml = function(url, next) {
    request(url, function(error, response, body) {
      if (error) {
        next(null);
      } else {
        next(body || "");
      }
    });
  };

  // Create instant from arg
  var createInstant = function(arg, autocomplete) {
    return new Item({
      title: arg.name,
      subtitle: arg.playUrl,
      autocomplete: autocomplete ? arg.name : "",
      arg: JSON.stringify(arg),
      valid: true,
      quicklookurl: arg.instantUrl,
      text: {
        copy: arg.instantUrl,
        largetype: arg.name
      },
      mods: {
        cmd: {
          arg: arg.instantUrl,
          subtitle: "Open instant in browser"
        },
      }
    });
  };

  // Parses HTML and returns any instants found
  var getInstants = function(html, autocomplete, next) {
    var instants = [];

    (new htmlparser.Parser(new htmlparser.DefaultHandler(function(error, dom) {
      if (error) {
        next(null);
      } else {
        var instantDoms = htmlparser.DomUtils.getElements({ class: "instant" }, dom);

        for (instantDom of instantDoms) {
          instants.push(createInstant({
            name: instantDom.children[3].children[0].data,
            playUrl: BASE_URL + (instantDom.children[1].attribs.onmousedown || instantDom.children[1].attribs.onclick).slice(6, -2),
            instantUrl: BASE_URL + instantDom.children[3].attribs.href
          }, autocomplete));
        }

        next(instants);
      }
    }, { verbose: false, ignoreWhitespace: true }))).parseComplete(html);
  };

  // Gets instants from url and adds each as a workflow item
  var parseInstants = function(url, autocomplete) {
    getHtml(url, function(html) {
      if (html == null) {
        workflow.addItem(new Item({
          title: "Error getting instants page HTML",
          icon: AlfredNode.ICONS.ERROR,
          valid: false
        }));

        workflow.feedback();
      } else {
        getInstants(html, autocomplete, function(instants) {
          if (instants == null) {
            workflow.addItem(new Item({
              title: "Error parsing HTML for instants",
              icon: AlfredNode.ICONS.ERROR,
              valid: false
            }));
          } else if (instants.length == 0) {
            workflow.addItem(new Item({
              title: "No instants found",
              icon: AlfredNode.ICONS.WARNING,
              valid: false
            }));
          } else {
            for (instant of instants) {
              workflow.addItem(instant);
            }
          }

          workflow.feedback();
        });
      }
    });
  };

  // Search instants
  actionHandler.onAction("search", function(query) {
    parseInstants(BASE_URL + "/search/?name=" + encodeURIComponent(query).replace(/%20/g, "+"), true);
  });

  // Best instants
  actionHandler.onAction("best", function() {
    parseInstants(BASE_URL, false);
  });

  // Trending instants
  actionHandler.onAction("trending", function() {
    parseInstants(BASE_URL + "/trending", false);
  });

  // New instants
  actionHandler.onAction("new", function() {
    parseInstants(BASE_URL + "/recent", false);
  });

  // Favorite instants
  actionHandler.onAction("favorites", function() {
    parseInstants(BASE_URL + "/profile/" + utils.envVars.get("favorites"), false);
  });

  // Board instants
  actionHandler.onAction("board", function(query) {
    parseInstants(BASE_URL + "/profile/" + encodeURIComponent(query), false);
  });

  // Recent instants
  actionHandler.onAction("recent", function(query) {
    var recent = storage.get("recent") || [];

    if (recent.length == 0) {
      workflow.addItem(new Item({
        title: "No instants found",
        icon: AlfredNode.ICONS.WARNING,
        valid: false
      }));
    } else {
      for (arg of recent) {
        workflow.addItem(new Item(createInstant(arg, false)));
      }
    }

    workflow.feedback();
  });

  // Play instant
  actionHandler.onAction("play", function(query) {
    var arg = JSON.parse(query);

    // Add to recents
    var recent = storage.get("recent") || [];
    var index = 0;
    for (recentArg of recent) {
      if (recentArg.playUrl == arg.playUrl) {
        recent.splice(index, 1);
        break;
      }
      index++;
    }
    recent.unshift(arg);
    storage.set("recent", recent.slice(0, 20));

    // Play sound
    exec("curl -s " + JSON.parse(query).playUrl + " > /tmp/alfred_myinstants.mp3 && afplay /tmp/alfred_myinstants.mp3");
  });

  AlfredNode.run();
})();
