#!/usr/bin/python
# encoding: utf-8

import sys
from workflow import web, Workflow, ICON_INFO
import HTMLParser

def main(wf):
    DAY = 86400
    base_url = "http://www.myinstants.com"

    # Calculate get url, cache name and max age
    type = wf.args[0]
    if type == "search":
        query = wf.args[1]
        get_url = base_url + "/search/?name=" + query.replace(" ", "+")
        cache_name = "search:" + query
        max_age = 30 * DAY
    elif type == "best":
        get_url = base_url
        cache_name = "best"
        max_age = DAY
    elif type == "trending":
        get_url = base_url + "/trending"
        cache_name = "trending"
        max_age = DAY
    elif type == "recent":
        get_url = base_url + "/recent"
        cache_name = "recent"
        max_age = DAY

    # Get instants from Myinstants
    def get_instants():
        instants = []

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
                                Parser.instant["url"] = base_url + value[6:-2]
                            elif name == "href":
                                Parser.instant["name"] = ""

            def handle_data(self, data):
                if Parser.instant != None and "name" in Parser.instant:
                    Parser.instant["name"] = data.decode("utf-8")
                    instants.append(Parser.instant)
                    Parser.instant = None

        # Get search webpage and parse
        response = web.get(get_url)
        if response.status_code == 200: Parser().feed(response.content)

        return instants

    # Populate workflow results and return
    instants = wf.cached_data(cache_name, get_instants, max_age=max_age)
    for instant in instants: wf.add_item(instant["name"], instant["url"], arg=instant["url"], valid=True)
    if len(instants) == 0: wf.add_item("None found", "No sounds found for choice", valid=False)
    wf.send_feedback()

if __name__ == "__main__":
    wf = Workflow(
        update_settings={ "github_slug": "flipxfx/alfred-myinstants" },
        help_url="https://github.com/flipxfx/alfred-myinstants#help"
    )
    sys.exit(wf.run(main))
