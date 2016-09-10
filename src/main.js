var AlfredNode = require("alfred-workflow-nodejs");
var actionHandler = AlfredNode.actionHandler;
var workflow = AlfredNode.workflow;
var Item = AlfredNode.Item;
var request = require("request");
var exec = require("child_process").exec;
var htmlparser = require("htmlparser");
var utils = AlfredNode.utils;

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

  // Parses HTML and returns any instants found
  var getInstants = function(html, autocomplete, next) {
    var instants = [];

    (new htmlparser.Parser(new htmlparser.DefaultHandler(function(error, dom) {
      if (error) {
        next(null);
      } else {
        var instantDoms = htmlparser.DomUtils.getElements({ class: "instant" }, dom);

        for (instantDom of instantDoms) {
          var name = instantDom.children[3].children[0].data;
          var play = instantDom.children[1].attribs.onmousedown || instantDom.children[1].attribs.onclick;
          var playUrl = BASE_URL + play.slice(6, -2);
          var instantUrl = BASE_URL + instantDom.children[3].attribs.href;

          instants.push(new Item({
            title: name,
            subtitle: playUrl,
            autocomplete: autocomplete ? name : "",
            arg: JSON.stringify({
              name: name,
              playUrl: playUrl,
              instantUrl: instantUrl
            }),
            valid: true,
            quicklookurl: instantUrl,
            text: {
              copy: instantUrl,
              largetype: name
            },
            mods: {
              cmd: {
                arg: instantUrl,
                subtitle: "Open instant in browser"
              },
            }
          }));
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

  // Play instant
  actionHandler.onAction("play", function(query) {
    var arg = JSON.parse(query);
    exec("curl -s " + JSON.parse(query).playUrl + " > /tmp/alfred_myinstants.mp3 && afplay /tmp/alfred_myinstants.mp3");
  });

  AlfredNode.run();
})();
