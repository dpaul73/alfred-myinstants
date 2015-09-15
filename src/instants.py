#!/usr/bin/python
# encoding: utf-8

import sys
from workflow import web, Workflow, ICON_ERROR, ICON_WARNING
import HTMLParser
import subprocess

BASE_URL = "http://www.myinstants.com"
DAY = 86400

def main(wf):
    # Change instant dict to arg string
    def instant_to_arg(instant):
        return instant["url"] + " " + instant["name"]

    # Change arg string to instant dict
    def arg_to_instant(arg):
        split = wf.args[1].split(" ", 1)
        return { "name": split[1], "url": split[0] }

    # Plays sound at given url
    def play_instant(instant):
        subprocess.call("curl -s " + instant["url"] + " > /tmp/alfred_myinstants.mp3 && afplay /tmp/alfred_myinstants.mp3", shell=True)

    # Get instants from Myinstants
    def get_instants(get_url, cache_name, max_age):
        instants = None

        # Parser to scrape instants from search webpage
        class Parser(HTMLParser.HTMLParser):
            instant = None

            def handle_starttag(self, tag, attributes):
                if len(instants) < 25 and (tag == "div" or tag == "a"):
                    for name, value in attributes:
                        if name == "class" and value == "instant":
                            Parser.instant = {}
                        elif Parser.instant != None:
                            if name == "onclick":
                                Parser.instant["url"] = wf.decode(BASE_URL + value[6:-2])
                            elif name == "href":
                                Parser.instant["name"] = ""

            def handle_data(self, data):
                if Parser.instant != None and "name" in Parser.instant:
                    Parser.instant["name"] = wf.decode(data)
                    instants.append(Parser.instant)
                    Parser.instant = None

        # Get and cache instants
        instants = wf.cached_data(cache_name, max_age=max_age)
        if instants == None:
            # Get instants
            try:
                instants = []
                response = web.get(get_url)
                if response.status_code == 200: Parser().feed(response.content)
                else: instants = None
            except:
                instants = None
            # Cache on success
            if instants != None and len(instants) > 0: wf.cached_data(cache_name, lambda: instants, max_age=max_age)

        # Build results
        if instants == None:
            wf.add_item("Error getting instants", "Unable to retrieve instants", valid=False, icon=ICON_ERROR)
        elif len(instants) == 0:
            wf.add_item("None found", "No sounds found for choice", valid=False, icon=ICON_WARNING)
        else:
            for instant in instants: wf.add_item(instant["name"], instant["url"], arg=instant_to_arg(instant), valid=True)

        # Return results
        wf.send_feedback()

    # Gets favorite instants
    def get_favorites():
        instants = wf.stored_data("favorites")
        if instants == None or len(instants) == 0:
            wf.add_item("None found", "No favorite sounds found (add to favorites with cmd+enter)", valid=False, icon=ICON_WARNING)
        else:
            for instant in instants: wf.add_item(instant["name"], instant["url"], arg=instant_to_arg(instant), valid=True)

    # Store a favorite
    def add_favorite(instant):
        instants = wf.stored_data("favorites")
        if instants == None: instants = []
        if instant in instants: instants.remove(instant)
        instants.insert(0, instant)
        wf.store_data("favorites", instants)

    # Remove a favorite
    def remove_favorite(instant):
        instants = wf.stored_data("favorites")
        instants.remove(instant)
        wf.store_data("favorites", instants)

    # Calculate get url, cache name and max age
    type = wf.args[0]
    if type == "play":
        play_instant(arg_to_instant(wf.args[1]))
    elif type == "search":
        query = wf.args[1]
        get_instants(BASE_URL + "/search/?name=" + query.replace(" ", "+"), "search:" + query, 7 * DAY)
    elif type == "best":
        get_instants(BASE_URL, "best", DAY)
    elif type == "trending":
        get_instants(BASE_URL + "/trending", "trending", DAY)
    elif type == "recent":
        get_instants(BASE_URL + "/recent", "recent", DAY)
    elif type == "favorites":
        get_favorites()
        wf.send_feedback()
    elif type == "favorite":
        add_favorite(arg_to_instant(wf.args[1]))
    elif type == "unfavorite":
        remove_favorite(arg_to_instant(wf.args[1]))

if __name__ == "__main__":
    wf = Workflow(
        update_settings={ "github_slug": "flipxfx/alfred-myinstants" },
        help_url="https://github.com/flipxfx/alfred-myinstants#help"
    )
    sys.exit(wf.run(main))
