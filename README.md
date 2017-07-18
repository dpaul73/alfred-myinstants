# alfred-myinstants

An [Alfred](https://www.alfredapp.com) workflow to search [Myinstants](http://www.myinstants.com) and play sounds.

# Get it
- Download the [latest release](https://github.com/flipxfx/alfred-myinstants/releases/latest)

# Help
- `i {{query}}` - search for instants with given query and play them
    - To search for instants containing "mlg", run `i mlg`, choose an instant, then hit `enter` to play it.
    - You can play custom instants by uploading them to [Myinstants.com/new](http://www.myinstants.com/new).
- `ibest` - get best of all time instants and play them
- `ifavs` - get list your favorites
    - To add favorties, login to [Myinstants](http://www.myinstants.com) and add your favorite sounds.
    - By default the favorites are pulled from my favorites soundboard, to get your own favorites you must set the workflow environment variable `favorites` to your username.
- `iboard {{query}}` - get list user specified favorites
    - Works the same as `ifavs` except you supply the username in the query so you can see favorites for different boards.
- `irecent` - get 20 most recently played instants

After you've used one of the above commands to get a list of instants you can do any of the following:
- Enter/Click: plays the selected instant
- Command+Enter: opens the selected instant page in browser (helpful to add to favorites, download, share)
- Shift: previews the selected instant page Quick Look
- Command+C: copies the url to the selected instant page
- Command+L: shows the selected instant name in large type
